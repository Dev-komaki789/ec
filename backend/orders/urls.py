"""カート / 注文の URL。config/urls.py から /api/ec/ 配下に include される。

GET    /api/ec/cart/
POST   /api/ec/cart/items/
PATCH  /api/ec/cart/items/<id>/
DELETE /api/ec/cart/items/<id>/
"""

from django.urls import path

from .views import (
    CartItemAddView,
    CartItemDetailView,
    CartView,
    OrderDetailView,
    OrdersView,
)

urlpatterns = [
    path('cart/', CartView.as_view(), name='cart'),
    path('cart/items/', CartItemAddView.as_view(), name='cart-item-add'),
    path('cart/items/<int:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('orders/', OrdersView.as_view(), name='orders'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
]
