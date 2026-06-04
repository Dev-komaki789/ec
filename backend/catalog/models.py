"""商品カタログのモデル群。

このアプリのテーブルは 2 種類に分かれる:

1. WMS マスタのコピー（読み取り専用、日次バッチ `sync_skus_from_wms` で更新）
   - EcCategory  ← WMS の categories
   - EcProduct   ← WMS の products
   - EcSku       ← WMS の skus
   コピー行は WMS の主キーを `wms_id` に保持して対応関係をとる。EC↔WMS をまたぐ
   参照は `wms_id` / `sku_code` での論理参照のみ（別 DB なので FK は張れない）。
   一方、EC 内のコピー同士（EcSku → EcProduct など）は同じ DB なので通常の FK で結合する。

2. EC 独自データ（EC が真実のソース）
   - EcPrice     価格マスタ（WMS には価格を持たせない方針）

設計の出所: WMS リポジトリ integration/HANDOVER_EC.md / api_spec.md
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class EcCategory(models.Model):
    """WMS categories のコピー。最大 4 階層の木構造（parent で表現）。"""

    # WMS 側の categories.id。同期時の対応づけと差分判定に使う。
    wms_id = models.BigIntegerField('WMS ID', unique=True)
    category_code = models.CharField('カテゴリコード', max_length=30, unique=True)
    category_name = models.CharField('カテゴリ名', max_length=100)
    description = models.TextField('説明', blank=True)
    # 親カテゴリ。WMS の parent_id を同期時に EcCategory に解決して張る（EC 内 DB なので通常の FK）。
    parent = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='親カテゴリ',
    )
    sort_order = models.IntegerField('表示順', default=10)
    is_leaf = models.BooleanField('商品の登録先', default=False)
    is_active = models.BooleanField('有効', default=True)
    # WMS 側の updated_at。次回同期の updated_since 基準に使う（コピー元がいつ更新されたか）。
    wms_updated_at = models.DateTimeField('WMS 更新日時', null=True, blank=True)
    # EC がこの行をコピー（UPSERT）した時刻。
    synced_at = models.DateTimeField('同期日時', auto_now=True)

    class Meta:
        db_table = 'ec_categories'
        verbose_name = 'カテゴリ（コピー）'
        verbose_name_plural = 'カテゴリ（コピー）'
        ordering = ['sort_order', 'category_code']

    def __str__(self):
        return self.category_name


class EcProduct(models.Model):
    """WMS products のコピー + EC 独自の商品画像。"""

    wms_id = models.BigIntegerField('WMS ID', unique=True)
    product_code = models.CharField('商品コード', max_length=50, unique=True)
    product_name = models.CharField('商品名', max_length=200)
    category = models.ForeignKey(
        EcCategory,
        on_delete=models.PROTECT,
        related_name='products',
        verbose_name='カテゴリ',
    )
    description = models.TextField('説明', blank=True)
    # WMS の manufacturer_id（メーカーはコピーテーブルを持たないので ID のみ論理参照で保持）。
    wms_manufacturer_id = models.BigIntegerField('WMS メーカー ID', null=True, blank=True)
    # メーカー名は表示用に非正規化してコピーしておく（WMS products API が返してくれる）。
    manufacturer_name = models.CharField('メーカー名', max_length=100, blank=True)
    # EC 独自: 商品画像。フェーズ1 はローカル media/ に保存、本番は django-storages で S3 に切替。
    # `product.image.url` で開発はローカル URL、本番は S3 URL が返るようにする（HANDOVER §11）。
    image = models.ImageField('商品画像', upload_to='products/', null=True, blank=True)
    is_active = models.BooleanField('有効', default=True)
    wms_updated_at = models.DateTimeField('WMS 更新日時', null=True, blank=True)
    synced_at = models.DateTimeField('同期日時', auto_now=True)

    class Meta:
        db_table = 'ec_products'
        verbose_name = '商品（コピー）'
        verbose_name_plural = '商品（コピー）'

    def __str__(self):
        return f'{self.product_name} ({self.product_code})'


class EcSku(models.Model):
    """WMS skus のコピー。在庫照会・注文明細のキーは sku_code。"""

    wms_id = models.BigIntegerField('WMS ID', unique=True)
    # EC 内 DB なので product への参照は通常の FK。
    product = models.ForeignKey(
        EcProduct,
        on_delete=models.PROTECT,
        related_name='skus',
        verbose_name='商品',
    )
    # WMS の在庫 API・出荷指示はこの sku_code をキーに連携する（HANDOVER §7, §8）。
    sku_code = models.CharField('SKUコード', max_length=50, unique=True)
    jan_code = models.CharField('JANコード', max_length=20, blank=True, db_index=True)
    size_info = models.CharField('サイズ', max_length=50, blank=True)
    color_info = models.CharField('カラー', max_length=50, blank=True)
    quantity_per_unit = models.IntegerField('入数（ケース）', default=1)
    # WMS のピッキング種別（'total' / 'order'）。EC では表示・参照用にそのまま保持する。
    picking_type = models.CharField('ピッキング種別', max_length=20, blank=True)
    is_active = models.BooleanField('有効', default=True)
    wms_updated_at = models.DateTimeField('WMS 更新日時', null=True, blank=True)
    synced_at = models.DateTimeField('同期日時', auto_now=True)

    class Meta:
        db_table = 'ec_skus'
        verbose_name = 'SKU（コピー）'
        verbose_name_plural = 'SKU（コピー）'

    def __str__(self):
        return f'{self.sku_code} ({self.product.product_name})'


class EcPrice(models.Model):
    """EC 独自の価格マスタ（WMS には価格を持たせない方針 / HANDOVER §3）。

    MVP では「1 SKU = 現在の 1 価格」を OneToOne で表す。
    時限価格や会員別価格が必要になったら、有効期間付きの複数行モデルへ拡張する。
    table 名は HANDOVER の命名に合わせて ec_price_lists。
    """

    sku = models.OneToOneField(
        EcSku,
        on_delete=models.CASCADE,
        related_name='price',
        verbose_name='SKU',
    )
    # 円・税抜。日本円は小数を使わないので decimal_places=0。
    price = models.DecimalField(
        '販売価格（税抜・円）',
        max_digits=10,
        decimal_places=0,
        validators=[MinValueValidator(0)],
    )
    # 消費税率。標準 10%。軽減税率(8%)の商品はこの値を変える。
    tax_rate = models.DecimalField(
        '消費税率', max_digits=4, decimal_places=2, default=Decimal('0.10')
    )
    is_active = models.BooleanField('有効', default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ec_price_lists'
        verbose_name = '価格'
        verbose_name_plural = '価格'

    def __str__(self):
        return f'{self.sku.sku_code}: {self.price}円(税抜)'

    @property
    def price_incl_tax(self):
        """税込価格（円・整数に丸め）。表示用。"""
        return int((self.price * (Decimal('1') + self.tax_rate)).quantize(Decimal('1')))
