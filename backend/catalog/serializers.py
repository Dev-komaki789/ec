"""商品カタログ API のシリアライザ（モデル → JSON 変換）。

商品一覧/詳細は EC 自身の DB だけで完結する（ec_products + ec_skus + ec_price_lists）。
WMS には問い合わせない＝高速（HANDOVER §6, B パターン）。
在庫数だけは別 API（get_stock 経由）なのでここには含めない。
"""

from rest_framework import serializers

from .models import EcProduct, EcSku


class EcSkuSerializer(serializers.ModelSerializer):
    # 価格は EcPrice(OneToOne, related_name='price')。未設定なら null を返す。
    price = serializers.SerializerMethodField()
    price_incl_tax = serializers.SerializerMethodField()

    class Meta:
        model = EcSku
        fields = [
            'id',
            'sku_code',
            'jan_code',
            'size_info',
            'color_info',
            'quantity_per_unit',
            'price',
            'price_incl_tax',
        ]

    def _price_obj(self, sku):
        # OneToOne の逆参照は未設定だと例外になるので getattr で吸収する。
        price = getattr(sku, 'price', None)
        if price is None or not price.is_active:
            return None
        return price

    def get_price(self, sku):
        price = self._price_obj(sku)
        return int(price.price) if price else None

    def get_price_incl_tax(self, sku):
        price = self._price_obj(sku)
        return price.price_incl_tax if price else None


class EcProductSerializer(serializers.ModelSerializer):
    category_code = serializers.CharField(source='category.category_code', read_only=True)
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    image_url = serializers.SerializerMethodField()
    # 有効な SKU だけを並べる。価格も各 SKU にぶら下げる。
    skus = serializers.SerializerMethodField()

    class Meta:
        model = EcProduct
        fields = [
            'id',
            'product_code',
            'product_name',
            'category_code',
            'category_name',
            'manufacturer_name',
            'description',
            'image_url',
            'skus',
        ]

    def get_image_url(self, product):
        if not product.image:
            return None
        request = self.context.get('request')
        url = product.image.url
        # frontend は別オリジンなので絶対 URL にして返す。
        return request.build_absolute_uri(url) if request else url

    def get_skus(self, product):
        active_skus = [s for s in product.skus.all() if s.is_active]
        return EcSkuSerializer(active_skus, many=True, context=self.context).data
