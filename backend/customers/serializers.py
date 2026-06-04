"""顧客の登録 / 自分情報のシリアライザ。"""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import CustomerProfile

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    """新規会員登録。User（認証）と CustomerProfile（EC 個人情報）を同時に作る。"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value):
        # ログインキーは username。登録時に username=email とするため重複も email で見る。
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('このメールアドレスは既に登録されています')
        return value

    @transaction.atomic
    def create(self, validated_data):
        # username=email にして「メールでログイン」を実現する（models.py の説明参照）。
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        CustomerProfile.objects.create(
            user=user,
            full_name=validated_data['full_name'],
            postal_code=validated_data.get('postal_code', ''),
            address=validated_data.get('address', ''),
            phone_number=validated_data.get('phone_number', ''),
        )
        return user


class MeSerializer(serializers.ModelSerializer):
    """ログイン中の顧客情報（User + Profile）。"""

    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ['email', 'full_name', 'postal_code', 'address', 'phone_number']
