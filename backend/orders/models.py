"""カートと注文のモデル。

このアプリは EC が真実のソースのデータ（HANDOVER §3）:
  - Cart / CartItem … 買い物カゴ（ログイン中の一時的な状態）
  - Order / OrderItem … 確定した注文（カート → 注文に状態遷移、次段で追加）

注文確定時に WMS の出荷指示 API（POST /api/orders/）を呼び、返ってきた出荷指示
番号を Order.wms_outbound_order_code に保存する（連携部分は次段で実装）。

価格は EC 独自データなので、注文時点の価格は OrderItem に「焼き付け」て保存する
（あとで価格改定が入っても過去の注文金額が変わらないようにするため）。Cart は
一時的なものなので価格を持たず、表示のたびに現在の EcPrice から計算する。
"""

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from catalog.models import EcSku


class Cart(models.Model):
    """1 ユーザー = 1 カート（OneToOne）。中身は CartItem。"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name='ユーザー',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ec_carts'
        verbose_name = 'カート'
        verbose_name_plural = 'カート'

    def __str__(self):
        return f'Cart(user={self.user.username})'


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    sku = models.ForeignKey(EcSku, on_delete=models.PROTECT, verbose_name='SKU')
    quantity = models.PositiveIntegerField('数量', default=1, validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ec_cart_items'
        verbose_name = 'カート明細'
        verbose_name_plural = 'カート明細'
        constraints = [
            # 同じ SKU は 1 行にまとめる（再追加は数量を増やす）。
            models.UniqueConstraint(fields=['cart', 'sku'], name='uk_cart_items_cart_sku'),
        ]

    def __str__(self):
        return f'{self.sku.sku_code} x{self.quantity}'

    @property
    def unit_price_incl_tax(self):
        """現在の税込単価。価格未設定なら None。"""
        price = getattr(self.sku, 'price', None)
        if price is None or not price.is_active:
            return None
        return price.price_incl_tax

    @property
    def line_total(self):
        """この明細の小計（税込）。価格未設定なら None。"""
        unit = self.unit_price_incl_tax
        return unit * self.quantity if unit is not None else None


class Order(models.Model):
    """確定した注文。カートから状態遷移して作られる。

    確定時に WMS の出荷指示 API を呼び、返ってきた出荷指示番号を
    wms_outbound_order_code に保存する（WMS をまたぐ参照なのでコード文字列で持つ）。
    配送先は注文時点のスナップショット（プロフィールが後で変わっても注文は不変）。
    """

    class Status(models.TextChoices):
        CONFIRMED = 'confirmed', '注文確定'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='orders',
        verbose_name='ユーザー',
    )
    status = models.CharField(
        '状態', max_length=20, choices=Status.choices, default=Status.CONFIRMED
    )
    # 配送先スナップショット（注文時にプロフィール or 入力値からコピー）。
    delivery_name = models.CharField('配送先氏名', max_length=100)
    delivery_postal_code = models.CharField('配送先郵便番号', max_length=10, blank=True)
    delivery_address = models.CharField('配送先住所', max_length=255)
    # 合計金額（税込）のスナップショット。
    total_amount = models.DecimalField('合計金額（税込）', max_digits=12, decimal_places=0)
    note = models.CharField('備考', max_length=255, blank=True)
    # WMS 連携結果。WMS をまたぐ参照は ID/コードの論理参照（HANDOVER §3）。
    wms_outbound_order_code = models.CharField('WMS 出荷指示番号', max_length=50, blank=True)
    wms_status = models.CharField('WMS 側ステータス', max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ec_orders'
        verbose_name = '注文'
        verbose_name_plural = '注文'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} ({self.user.username})'

    @property
    def order_number(self):
        """EC の注文番号。WMS に渡す external_order_id もこれを使う。"""
        return f'EC-{self.pk:06d}'


class OrderItem(models.Model):
    """注文明細。価格・商品名は注文時点の値を焼き付けて保存する。"""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    # SKU は将来コピーが消える可能性もあるので参照は SET_NULL。表示は下のスナップショットを使う。
    sku = models.ForeignKey(EcSku, on_delete=models.SET_NULL, null=True, blank=True)
    sku_code = models.CharField('SKUコード', max_length=50)
    product_name = models.CharField('商品名', max_length=200)
    size_info = models.CharField('サイズ', max_length=50, blank=True)
    color_info = models.CharField('カラー', max_length=50, blank=True)
    unit_price = models.DecimalField('単価（税込）', max_digits=10, decimal_places=0)
    quantity = models.PositiveIntegerField('数量')

    class Meta:
        db_table = 'ec_order_items'
        verbose_name = '注文明細'
        verbose_name_plural = '注文明細'

    def __str__(self):
        return f'{self.sku_code} x{self.quantity}'

    @property
    def line_total(self):
        return self.unit_price * self.quantity
