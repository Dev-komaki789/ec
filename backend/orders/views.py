"""カート API。すべてログイン必須（JWT）。カートは request.user に紐づく。

GET    /api/ec/cart/             カートの中身 + 合計
POST   /api/ec/cart/items/       追加 {sku_code, quantity}（既存 SKU は数量加算）
PATCH  /api/ec/cart/items/<id>/  数量変更 {quantity}
DELETE /api/ec/cart/items/<id>/  削除
"""

from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import EcSku
from catalog.wms_client import StockShortage, WmsUnavailable, create_outbound_order

from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CreateOrderSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)


def _get_cart(user):
    """ユーザーのカートを取得（無ければ作る）。"""
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def _cart_response(cart):
    # prefetch して N+1 を避けつつシリアライズ。
    cart = (
        Cart.objects.filter(pk=cart.pk)
        .prefetch_related('items__sku__product', 'items__sku__price')
        .first()
    )
    return Response(CartSerializer(cart).data)


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = _get_cart(request.user)
        return _cart_response(cart)


class CartItemAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sku_code = serializer.validated_data['sku_code']
        quantity = serializer.validated_data['quantity']

        sku = EcSku.objects.filter(sku_code=sku_code, is_active=True).first()
        if sku is None:
            return Response(
                {'error': 'not_found', 'message': f'SKU {sku_code} は存在しません'},
                status=status.HTTP_404_NOT_FOUND,
            )

        cart = _get_cart(request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart, sku=sku, defaults={'quantity': quantity}
        )
        if not created:
            # 既にカートにある SKU は数量を加算する（競合しないよう DB 側で F() 加算）。
            item.quantity = F('quantity') + quantity
            item.save(update_fields=['quantity'])

        return _cart_response(cart)


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_item(self, request, pk):
        # 自分のカートの明細だけ操作できるよう cart__user で絞る。
        return get_object_or_404(CartItem, pk=pk, cart__user=request.user)

    def patch(self, request, pk):
        item = self._get_item(request, pk)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.quantity = serializer.validated_data['quantity']
        item.save(update_fields=['quantity'])
        return _cart_response(item.cart)

    def delete(self, request, pk):
        item = self._get_item(request, pk)
        cart = item.cart
        item.delete()
        return _cart_response(cart)


class OrdersView(APIView):
    """注文履歴一覧 / 注文確定。"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 自分の注文だけ、新しい順。
        orders = (
            Order.objects.filter(user=request.user)
            .prefetch_related('items')
            .order_by('-created_at')
        )
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request):
        """カートの内容で注文を確定し、WMS に出荷指示を作成する（HANDOVER §8）。"""
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        overrides = serializer.validated_data

        cart = _get_cart(request.user)
        cart_items = list(cart.items.select_related('sku__product', 'sku__price').all())
        if not cart_items:
            return Response(
                {'error': 'empty_cart', 'message': 'カートが空です'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 価格未設定の商品が混じっていたら確定できない（金額が決まらないため）。
        if any(item.unit_price_incl_tax is None for item in cart_items):
            return Response(
                {'error': 'price_missing', 'message': '価格が設定されていない商品があります'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 配送先: リクエストで指定があればそれを、無ければプロフィールの既定値を使う。
        profile = request.user.customer_profile
        delivery_name = overrides.get('delivery_name') or profile.full_name
        delivery_postal_code = overrides.get('delivery_postal_code') or profile.postal_code
        delivery_address = overrides.get('delivery_address') or profile.address
        if not delivery_name or not delivery_address:
            return Response(
                {'error': 'delivery_required', 'message': '配送先の氏名・住所が必要です'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_amount = sum(item.line_total for item in cart_items)

        try:
            with transaction.atomic():
                # 1) EC 側に注文を作成（価格を OrderItem に焼き付ける）
                order = Order.objects.create(
                    user=request.user,
                    delivery_name=delivery_name,
                    delivery_postal_code=delivery_postal_code,
                    delivery_address=delivery_address,
                    total_amount=total_amount,
                    note=overrides.get('note', ''),
                )
                OrderItem.objects.bulk_create(
                    [
                        OrderItem(
                            order=order,
                            sku=item.sku,
                            sku_code=item.sku.sku_code,
                            product_name=item.sku.product.product_name,
                            size_info=item.sku.size_info,
                            color_info=item.sku.color_info,
                            unit_price=item.unit_price_incl_tax,
                            quantity=item.quantity,
                        )
                        for item in cart_items
                    ]
                )

                # 2) WMS に出荷指示を作成。在庫不足(409)なら例外 → atomic がロールバック。
                wms_result = create_outbound_order(
                    external_order_id=order.order_number,
                    delivery_name=delivery_name,
                    delivery_address=delivery_address,
                    delivery_postal_code=delivery_postal_code,
                    items=[
                        {'sku_code': i.sku.sku_code, 'quantity': i.quantity} for i in cart_items
                    ],
                    note=overrides.get('note', ''),
                )

                # 3) 出荷指示番号を保存
                order.wms_outbound_order_code = wms_result.get('outbound_order_code', '')
                order.wms_status = wms_result.get('status', '')
                order.save(update_fields=['wms_outbound_order_code', 'wms_status'])

                # 4) カートを空にする
                cart.items.all().delete()
        except StockShortage as e:
            # WMS 側もロールバック済み。EC 注文も作られていない（atomic）。
            return Response(
                {'error': 'stock_shortage', 'message': e.message, 'details': e.details},
                status=status.HTTP_409_CONFLICT,
            )
        except WmsUnavailable:
            return Response(
                {
                    'error': 'wms_unavailable',
                    'message': '注文処理に失敗しました。時間をおいて再度お試しください。',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """注文詳細（自分の注文のみ）。"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order.objects.prefetch_related('items'), pk=pk, user=request.user)
        return Response(OrderSerializer(order).data)
