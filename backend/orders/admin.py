from django.contrib import admin

from .models import Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'updated_at')
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('sku_code', 'product_name', 'unit_price', 'quantity')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number',
        'user',
        'status',
        'total_amount',
        'wms_outbound_order_code',
        'created_at',
    )
    list_filter = ('status',)
    search_fields = ('wms_outbound_order_code', 'user__username', 'delivery_name')
    inlines = [OrderItemInline]
