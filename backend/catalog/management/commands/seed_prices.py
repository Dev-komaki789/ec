"""開発用: 全 SKU にダミー価格（EcPrice）を投入する。

価格は EC が真実のソースで WMS からは同期されないため、開発中の商品一覧/カート
動作確認用に仮の価格を入れる。本番では使わない（実際の価格は管理画面等で入力する）。

    uv run python manage.py seed_prices          # 価格未設定の SKU にだけ入れる（既存は触らない）
    uv run python manage.py seed_prices --force  # 既存価格も上書きする

価格は sku.wms_id から決まる固定値（毎回同じ）。500〜5400 円（税抜）の範囲でばらつかせる。
"""

from decimal import Decimal

from django.core.management.base import BaseCommand

from catalog.models import EcPrice, EcSku


def dummy_price_for(sku):
    """SKU ごとに決まる仮価格（円・税抜）。再実行しても同じ値になるよう wms_id 基準。"""
    return Decimal(500 + (sku.wms_id % 50) * 100)


class Command(BaseCommand):
    help = '開発用: 全 SKU にダミー価格を投入する'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='既存の価格も上書きする（デフォルトは未設定の SKU のみ）',
        )

    def handle(self, *args, **options):
        force = options['force']
        created = updated = skipped = 0

        for sku in EcSku.objects.all():
            price = dummy_price_for(sku)
            existing = EcPrice.objects.filter(sku=sku).first()
            if existing is None:
                EcPrice.objects.create(sku=sku, price=price)
                created += 1
            elif force:
                existing.price = price
                existing.save(update_fields=['price'])
                updated += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'ダミー価格: 新規 {created} 件 / 上書き {updated} 件 / スキップ {skipped} 件'
            )
        )
