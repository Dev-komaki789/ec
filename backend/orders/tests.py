"""注文フローのテスト。

WMS への HTTP 呼び出し（create_outbound_order）はモックして、EC 側の挙動だけを
検証する。特に在庫不足・WMS 障害のときに注文が残らないこと（論理ロールバック）を確認する。
"""

from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from catalog.models import EcCategory, EcPrice, EcProduct, EcSku
from catalog.wms_client import StockShortage, WmsUnavailable
from customers.models import CustomerProfile
from orders.models import Order

User = get_user_model()


class OrderFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='t@example.com', email='t@example.com', password='pass12345'
        )
        CustomerProfile.objects.create(
            user=self.user,
            full_name='テスト太郎',
            postal_code='100-0001',
            address='東京都千代田区1-1',
        )
        cat = EcCategory.objects.create(wms_id=1, category_code='CAT-001', category_name='工具')
        prod = EcProduct.objects.create(
            wms_id=1, product_code='PRD-1', product_name='スパナ', category=cat
        )
        self.sku = EcSku.objects.create(wms_id=1, product=prod, sku_code='SKU-1')
        EcPrice.objects.create(sku=self.sku, price=Decimal('1000'))  # 税込 1100
        self.client.force_authenticate(self.user)

    def _add_to_cart(self, qty=1):
        return self.client.post(
            '/api/ec/cart/items/', {'sku_code': 'SKU-1', 'quantity': qty}, format='json'
        )

    @patch('orders.views.create_outbound_order')
    def test_order_success(self, mock_wms):
        mock_wms.return_value = {'outbound_order_code': 'OMS-1', 'status': 'inspection_wait'}
        self._add_to_cart(2)

        res = self.client.post('/api/ec/orders/', {}, format='json')

        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'confirmed')
        self.assertEqual(res.data['wms_outbound_order_code'], 'OMS-1')
        # WMS には正しい外部注文ID・明細が渡る
        mock_wms.assert_called_once()
        self.assertEqual(mock_wms.call_args.kwargs['items'], [{'sku_code': 'SKU-1', 'quantity': 2}])
        # 金額が焼き付く（1100 × 2）
        order = Order.objects.get()
        self.assertEqual(order.total_amount, Decimal('2200'))
        self.assertEqual(order.items.count(), 1)
        # カートは空になる
        self.assertEqual(self.client.get('/api/ec/cart/').data['total_quantity'], 0)

    @patch('orders.views.create_outbound_order')
    def test_stock_shortage_leaves_no_order(self, mock_wms):
        mock_wms.side_effect = StockShortage('在庫不足です')
        self._add_to_cart(5)

        res = self.client.post('/api/ec/orders/', {}, format='json')

        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['error'], 'stock_shortage')
        # 注文は残らない（PENDING も削除される）
        self.assertEqual(Order.objects.count(), 0)
        # カートは保持される（数量を直して再試行できる）
        self.assertEqual(self.client.get('/api/ec/cart/').data['total_quantity'], 5)

    @patch('orders.views.create_outbound_order')
    def test_wms_unavailable_leaves_no_order(self, mock_wms):
        mock_wms.side_effect = WmsUnavailable('connection refused')
        self._add_to_cart(1)

        res = self.client.post('/api/ec/orders/', {}, format='json')

        self.assertEqual(res.status_code, 503)
        self.assertEqual(Order.objects.count(), 0)

    def test_empty_cart_rejected(self):
        res = self.client.post('/api/ec/orders/', {}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['error'], 'empty_cart')

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        res = self.client.post('/api/ec/orders/', {}, format='json')
        self.assertEqual(res.status_code, 401)


class CartTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='c@example.com', password='pass12345')
        cat = EcCategory.objects.create(wms_id=1, category_code='CAT-001', category_name='工具')
        prod = EcProduct.objects.create(
            wms_id=1, product_code='PRD-1', product_name='スパナ', category=cat
        )
        sku = EcSku.objects.create(wms_id=1, product=prod, sku_code='SKU-1')
        EcPrice.objects.create(sku=sku, price=Decimal('1000'))
        self.client.force_authenticate(self.user)

    def test_add_same_sku_increments(self):
        self.client.post('/api/ec/cart/items/', {'sku_code': 'SKU-1', 'quantity': 2}, format='json')
        res = self.client.post(
            '/api/ec/cart/items/', {'sku_code': 'SKU-1', 'quantity': 3}, format='json'
        )
        self.assertEqual(res.data['total_quantity'], 5)
        self.assertEqual(len(res.data['items']), 1)

    def test_add_unknown_sku(self):
        res = self.client.post(
            '/api/ec/cart/items/', {'sku_code': 'NOPE', 'quantity': 1}, format='json'
        )
        self.assertEqual(res.status_code, 404)

    def test_cannot_touch_others_item(self):
        self.client.post('/api/ec/cart/items/', {'sku_code': 'SKU-1', 'quantity': 1}, format='json')
        item_id = self.client.get('/api/ec/cart/').data['items'][0]['id']
        # 別ユーザーからは触れない
        other = User.objects.create_user(username='o@example.com', password='pass12345')
        self.client.force_authenticate(other)
        res = self.client.patch(f'/api/ec/cart/items/{item_id}/', {'quantity': 9}, format='json')
        self.assertEqual(res.status_code, 404)
