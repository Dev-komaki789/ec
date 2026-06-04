"""EC 顧客のモデル。

顧客の認証（メール / パスワード）は Django 標準の User をそのまま使う。
理由: すでに auth テーブルを migrate 済みで、独自 User への切替は困難。標準 User
を使えばパスワードのハッシュ化・検証など認証まわりを自前で書かずに済む。

EC 固有の項目（配送先など個人情報）は User に直接足さず、この CustomerProfile に
OneToOne でぶら下げる。HANDOVER §10 のとおり、これらの個人情報は EC 側だけが持ち、
WMS には同期しない（注文時に配送先として OutboundOrder に書き込むだけ）。

ログインは「メールアドレス」で行う。標準 User のログインキーは username なので、
登録時に username = email として保存する（customers/serializers.py 参照）。
"""

from django.conf import settings
from django.db import models


class CustomerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        verbose_name='ユーザー',
    )
    # 配送先の既定値。注文時にコピーして OutboundOrder の delivery_* に渡す。
    full_name = models.CharField('氏名', max_length=100)
    postal_code = models.CharField('郵便番号', max_length=10, blank=True)
    address = models.CharField('住所', max_length=255, blank=True)
    phone_number = models.CharField('電話番号', max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ec_customers'
        verbose_name = '顧客'
        verbose_name_plural = '顧客'

    def __str__(self):
        return f'{self.full_name} <{self.user.email}>'
