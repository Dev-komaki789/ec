"""
URL configuration for config project (EC backend).

EC API は /api/ec/ 配下に置く（モデル / ViewSet 実装時に各アプリの urls を include する）。
API 仕様は drf-spectacular が自動生成し、Swagger UI を /api/schema/swagger-ui/ で公開する。
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    # OpenAPI スキーマ（JSON）と Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/schema/swagger-ui/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
    # EC API（実装時にここへ各アプリの urls を include していく）
    path('api/ec/', include('catalog.urls')),
    path('api/ec/auth/', include('customers.urls')),
    path('api/ec/', include('orders.urls')),
]

# 開発時のみ: アップロードした商品画像（media/）を runserver から配信する。
# 本番は nginx / S3 が配信するのでこの設定は使わない。
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
