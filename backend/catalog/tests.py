"""カタログ: 同期コマンドと商品 API のテスト。

同期は WMS への HTTP（fetch_list）をモックして、UPSERT・冪等性を検証する。
"""

from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APITestCase

from catalog.models import EcCategory, EcProduct, EcSku


def _fake_fetch_list(path, params=None):
    """WMS API の代わりに固定データを返す（path ごとに切り替え）。"""
    if path == '/categories/':
        return [
            {
                'id': 1,
                'category_code': 'CAT-001',
                'category_name': '工具',
                'parent_id': None,
                'updated_at': '2026-06-01T00:00:00Z',
            }
        ]
    if path == '/products/':
        return [
            {
                'id': 1,
                'product_code': 'PRD-1',
                'product_name': 'スパナ',
                'category_id': 1,
                'manufacturer_id': 3,
                'manufacturer_name': 'メーカーA',
                'updated_at': '2026-06-01T00:00:00Z',
            }
        ]
    if path == '/skus/':
        return [
            {
                'id': 1,
                'sku_code': 'SKU-1',
                'product_id': 1,
                'jan_code': '4900000000001',
                'size_info': '10mm',
                'color_info': '',
                'quantity_per_unit': 1,
                'picking_type': 'total',
                'updated_at': '2026-06-01T00:00:00Z',
            }
        ]
    return []


class SyncCommandTests(TestCase):
    @patch(
        'catalog.management.commands.sync_skus_from_wms.fetch_list', side_effect=_fake_fetch_list
    )
    def test_sync_upserts_and_is_idempotent(self, _mock):
        call_command('sync_skus_from_wms', stdout=StringIO())
        self.assertEqual(EcCategory.objects.count(), 1)
        self.assertEqual(EcProduct.objects.count(), 1)
        self.assertEqual(EcSku.objects.count(), 1)
        # 非正規化したメーカー名もコピーされる
        self.assertEqual(EcProduct.objects.get().manufacturer_name, 'メーカーA')
        # SKU → 商品 → カテゴリの FK が解決されている
        self.assertEqual(EcSku.objects.get().product.category.category_name, '工具')

        # もう一度流しても増えない（冪等）
        call_command('sync_skus_from_wms', stdout=StringIO())
        self.assertEqual(EcProduct.objects.count(), 1)


class ProductApiTests(APITestCase):
    def setUp(self):
        root = EcCategory.objects.create(wms_id=1, category_code='CAT-001', category_name='工具')
        child = EcCategory.objects.create(
            wms_id=2, category_code='CAT-001-01', category_name='切削工具', parent=root
        )
        EcProduct.objects.create(wms_id=1, product_code='P1', product_name='スパナ', category=child)
        EcProduct.objects.create(wms_id=2, product_code='P2', product_name='ドリル', category=root)

    def test_subtree_filter_includes_descendants(self):
        # 親カテゴリで絞ると、子カテゴリ配下の商品も含まれる
        res = self.client.get('/api/ec/products/?category=CAT-001')
        self.assertEqual(res.data['count'], 2)
        # 子カテゴリだけならその 1 件
        res2 = self.client.get('/api/ec/products/?category=CAT-001-01')
        self.assertEqual(res2.data['count'], 1)

    def test_search(self):
        res = self.client.get('/api/ec/products/?search=スパナ')
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['product_name'], 'スパナ')

    def test_categories_endpoint(self):
        res = self.client.get('/api/ec/categories/')
        self.assertEqual(len(res.data), 2)
