"""顧客の登録 / 自分情報 API。

ログイン（トークン発行）と更新は simplejwt の標準ビューを customers/urls.py で
そのまま使う（TokenObtainPairView / TokenRefreshView）。ここに書くのは
EC 独自の「登録」と「自分情報の取得」だけ。
"""

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import MeSerializer, RegisterSerializer


class RegisterView(APIView):
    """POST /api/ec/auth/register/  新規会員登録（認証不要）。"""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'email': user.email, 'message': '登録が完了しました。ログインしてください。'},
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """ログイン中の顧客情報（要 JWT）。

    GET   /api/ec/auth/me/   取得
    PATCH /api/ec/auth/me/   更新（氏名・郵便番号・住所・電話番号）
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.customer_profile
        return Response(MeSerializer(profile).data)

    def patch(self, request):
        profile = request.user.customer_profile
        serializer = MeSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
