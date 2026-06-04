"""カート / 注文 API のシリアライザ。"""

from rest_framework import serializers

from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    """カート 1 行の表示用。価格は現在の EcPrice から計算する。"""

    sku_code = serializers.CharField(source='sku.sku_code', read_only=True)
    product_name = serializers.CharField(source='sku.product.product_name', read_only=True)
    size_info = serializers.CharField(source='sku.size_info', read_only=True)
    color_info = serializers.CharField(source='sku.color_info', read_only=True)
    unit_price = serializers.IntegerField(source='unit_price_incl_tax', read_only=True)
    line_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'sku_code',
            'product_name',
            'size_info',
            'color_info',
            'quantity',
            'unit_price',
            'line_total',
        ]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_quantity = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['items', 'total_quantity', 'total_amount']

    def get_total_quantity(self, cart):
        return sum(item.quantity for item in cart.items.all())

    def get_total_amount(self, cart):
        # 価格未設定（line_total=None）の明細は合計から除く。
        return sum(item.line_total or 0 for item in cart.items.all())


class AddCartItemSerializer(serializers.Serializer):
    """カートへの追加リクエスト: {sku_code, quantity}。"""

    sku_code = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    """数量変更リクエスト: {quantity}。"""

    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'sku_code',
            'product_name',
            'size_info',
            'color_info',
            'unit_price',
            'quantity',
            'line_total',
        ]


class OrderSerializer(serializers.ModelSerializer):
    """注文の表示（履歴一覧 / 詳細）。"""

    order_number = serializers.CharField(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'status',
            'delivery_name',
            'delivery_postal_code',
            'delivery_address',
            'total_amount',
            'note',
            'wms_outbound_order_code',
            'wms_status',
            'created_at',
            'items',
        ]


class CreateOrderSerializer(serializers.Serializer):
    """注文確定リクエスト。配送先は未指定ならプロフィールの値を使う（全て任意）。"""

    delivery_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    delivery_postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    delivery_address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)
