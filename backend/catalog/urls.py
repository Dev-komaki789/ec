"""catalog アプリの URL。config/urls.py から /api/ec/ 配下に include される。

router が自動で:
  GET /api/ec/products/        商品一覧
  GET /api/ec/products/{id}/   商品詳細
を生やす。
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EcProductViewSet, StockView

router = DefaultRouter()
router.register('products', EcProductViewSet, basename='ecproduct')

urlpatterns = [
    path('stock/', StockView.as_view(), name='ec-stock'),
    *router.urls,
]
