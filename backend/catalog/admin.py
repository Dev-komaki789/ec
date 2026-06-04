"""カタログの管理画面登録。

開発中に同期結果や価格を目視確認するための最小構成。コピーテーブル
（カテゴリ / 商品 / SKU）は WMS が真実のソースなので基本は読み取り用途。
"""

from django.contrib import admin

from .models import EcCategory, EcPrice, EcProduct, EcSku


@admin.register(EcCategory)
class EcCategoryAdmin(admin.ModelAdmin):
    list_display = ('category_code', 'category_name', 'parent', 'is_leaf', 'is_active', 'synced_at')
    list_filter = ('is_active', 'is_leaf')
    search_fields = ('category_code', 'category_name')


@admin.register(EcProduct)
class EcProductAdmin(admin.ModelAdmin):
    list_display = ('product_code', 'product_name', 'category', 'is_active', 'synced_at')
    list_filter = ('is_active', 'category')
    search_fields = ('product_code', 'product_name')


@admin.register(EcSku)
class EcSkuAdmin(admin.ModelAdmin):
    list_display = ('sku_code', 'product', 'size_info', 'color_info', 'is_active', 'synced_at')
    list_filter = ('is_active',)
    search_fields = ('sku_code', 'jan_code', 'product__product_name')


@admin.register(EcPrice)
class EcPriceAdmin(admin.ModelAdmin):
    list_display = ('sku', 'price', 'tax_rate', 'price_incl_tax', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('sku__sku_code',)
