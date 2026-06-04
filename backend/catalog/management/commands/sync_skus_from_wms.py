"""WMS のマスタ（カテゴリ / 商品 / SKU）を EC 側コピーテーブルへ同期する。

HANDOVER_EC.md §4（B パターン: データレプリケーション）の実装。
毎日深夜に cron / Celery Beat 等で実行する想定。手動実行も可:

    uv run python manage.py sync_skus_from_wms

WMS の主キー（id）を EcXxx.wms_id に保持し、update_or_create で UPSERT する。
冪等なので何度流しても同じ結果になる。物理削除はせず、WMS 側で消えたものは
is_active=false がコピーされて非表示になる（HANDOVER の方針）。

同期順は依存関係どおり: カテゴリ → 商品 → SKU。

--since:
    将来 WMS が updated_since 差分取得に対応したとき用の引数（ISO8601）。
    現状の WMS は updated_since を無視して全件返すため、指定しても実質フル同期になる。
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.dateparse import parse_datetime

from catalog.models import EcCategory, EcProduct, EcSku
from catalog.wms_client import fetch_list


class Command(BaseCommand):
    help = 'WMS のカテゴリ/商品/SKU を EC のコピーテーブルへ同期する'

    def add_arguments(self, parser):
        parser.add_argument(
            '--since',
            dest='since',
            default=None,
            help='この日時以降に更新されたものだけ取得（ISO8601）。WMS 未対応の間は無視される。',
        )

    def handle(self, *args, **options):
        params = {}
        if options['since']:
            params['updated_since'] = options['since']

        with transaction.atomic():
            n_cat = self._sync_categories(params)
            n_prod = self._sync_products(params)
            n_sku = self._sync_skus(params)

        self.stdout.write(
            self.style.SUCCESS(f'同期完了: カテゴリ {n_cat} 件 / 商品 {n_prod} 件 / SKU {n_sku} 件')
        )

    def _sync_categories(self, params):
        """カテゴリを UPSERT。parent は自己参照なので 2 パスで解決する。

        パス1: 全カテゴリを parent 抜きで UPSERT し、wms_id→EcCategory を作る。
        パス2: 各行の parent_id を EcCategory に解決して張り直す。
        （WMS が親より先に子を返しても確実に解決できるようにするため）
        """
        rows = list(fetch_list('/categories/', params))

        by_wms_id = {}
        for row in rows:
            obj, _ = EcCategory.objects.update_or_create(
                wms_id=row['id'],
                defaults={
                    'category_code': row['category_code'],
                    'category_name': row['category_name'],
                    'description': row.get('description', ''),
                    'sort_order': row.get('sort_order', 10),
                    'is_leaf': row.get('is_leaf', False),
                    'is_active': row.get('is_active', True),
                    'wms_updated_at': parse_datetime(row['updated_at'])
                    if row.get('updated_at')
                    else None,
                },
            )
            by_wms_id[row['id']] = obj

        # パス2: parent を張る
        for row in rows:
            parent_wms_id = row.get('parent_id')
            obj = by_wms_id[row['id']]
            new_parent = by_wms_id.get(parent_wms_id) if parent_wms_id else None
            if obj.parent_id != (new_parent.id if new_parent else None):
                obj.parent = new_parent
                obj.save(update_fields=['parent'])

        return len(rows)

    def _sync_products(self, params):
        """商品を UPSERT。category は wms の category_id を EcCategory に解決して張る。"""
        # category_id(wms) → EcCategory.id の対応表を一括で作る（N+1 を避ける）。
        cat_map = {c.wms_id: c.id for c in EcCategory.objects.all()}

        count = 0
        for row in fetch_list('/products/', params):
            category_id = cat_map.get(row['category_id'])
            if category_id is None:
                # カテゴリ未同期。先にカテゴリ同期が走っているはずなので通常起きない。
                self.stderr.write(
                    f'  スキップ: 商品 {row["product_code"]} のカテゴリ '
                    f'(wms_id={row["category_id"]}) がコピーに無い'
                )
                continue
            EcProduct.objects.update_or_create(
                wms_id=row['id'],
                defaults={
                    'product_code': row['product_code'],
                    'product_name': row['product_name'],
                    'category_id': category_id,
                    'description': row.get('description', ''),
                    'wms_manufacturer_id': row.get('manufacturer_id'),
                    'manufacturer_name': row.get('manufacturer_name') or '',
                    'is_active': row.get('is_active', True),
                    'wms_updated_at': parse_datetime(row['updated_at'])
                    if row.get('updated_at')
                    else None,
                },
            )
            count += 1
        return count

    def _sync_skus(self, params):
        """SKU を UPSERT。product は wms の product_id を EcProduct に解決して張る。"""
        prod_map = {p.wms_id: p.id for p in EcProduct.objects.all()}

        count = 0
        for row in fetch_list('/skus/', params):
            product_id = prod_map.get(row['product_id'])
            if product_id is None:
                self.stderr.write(
                    f'  スキップ: SKU {row["sku_code"]} の商品 '
                    f'(wms_id={row["product_id"]}) がコピーに無い'
                )
                continue
            EcSku.objects.update_or_create(
                wms_id=row['id'],
                defaults={
                    'product_id': product_id,
                    'sku_code': row['sku_code'],
                    'jan_code': row.get('jan_code', ''),
                    'size_info': row.get('size_info', ''),
                    'color_info': row.get('color_info', ''),
                    'quantity_per_unit': row.get('quantity_per_unit', 1),
                    'picking_type': row.get('picking_type', ''),
                    'is_active': row.get('is_active', True),
                    'wms_updated_at': parse_datetime(row['updated_at'])
                    if row.get('updated_at')
                    else None,
                },
            )
            count += 1
        return count
