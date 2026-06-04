"""顧客 / 認証の URL。config/urls.py から /api/ec/auth/ 配下に include される。

  POST /api/ec/auth/register/       新規登録
  POST /api/ec/auth/token/          ログイン（access / refresh を発行）
  POST /api/ec/auth/token/refresh/  access の再発行（refresh を渡す）
  GET  /api/ec/auth/me/             ログイン中の顧客情報（要 access トークン）

ログインのリクエストボディは {"username": "<メールアドレス>", "password": "..."}。
登録時に username=email としているため、username にメールアドレスを入れる。
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import MeView, RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
]
