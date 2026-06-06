"""seed_images/categories/ のカテゴリ画像を、配下商品の画像に一括設定する。

画像ファイルがあるカテゴリ（ルート/中カテゴリどれでも可）について、その配下
（子孫カテゴリ含む）の全商品に同じ画像を割り当てる。例えば中カテゴリ単位で
14 枚置けば、商品 100 点に個別画像を用意しなくても一覧が成立する（デモ用途）。

画像ファイルの探し方（seed_images/categories/ の中）:
  <カテゴリコード>.png/.jpg/.jpeg/.webp   例: CAT-001-01.png
  <カテゴリ名>.png/...                     例: 切削工具.png

    uv run python manage.py seed_product_images          # 画像未設定の商品にだけ設定
    uv run python manage.py seed_product_images --force  # 既に画像がある商品も上書き

実体は media/products/categories/ に置き、各商品はそのパスを共有する（コピーを量産しない）。
"""

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q

from catalog.models import EcCategory, EcProduct

EXTS = ['.png', '.jpg', '.jpeg', '.webp']
MEDIA_SUBDIR = 'products/categories'


class Command(BaseCommand):
    help = 'カテゴリ代表画像を配下商品に一括設定する'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='既に画像がある商品も上書き')

    def handle(self, *args, **options):
        force = options['force']
        seed_dir = settings.BASE_DIR / 'seed_images' / 'categories'
        if not seed_dir.exists():
            self.stderr.write(
                f'{seed_dir} がありません。画像を置くか gen_placeholder_images を先に実行してください。'
            )
            return

        media_root = Path(settings.MEDIA_ROOT)
        (media_root / MEDIA_SUBDIR).mkdir(parents=True, exist_ok=True)

        children = self._children_map()
        # ルートに限らず「画像ファイルがあるカテゴリ」すべてに割り当てる。
        # コードの浅い順（CAT-001 → CAT-001-01）に処理するので、親と子の両方に画像が
        # あれば、より具体的な子カテゴリの画像が後勝ちで上書きする。
        categories = EcCategory.objects.all().order_by('category_code')

        total = 0
        for cat in categories:
            src = self._find_image(seed_dir, cat)
            if src is None:
                continue  # 画像が無いカテゴリは黙ってスキップ

            # media にコピーして、その相対パスを商品に共有させる。
            rel = f'{MEDIA_SUBDIR}/{cat.category_code}{src.suffix.lower()}'
            shutil.copy(src, media_root / rel)

            qs = EcProduct.objects.filter(category_id__in=self._descendants(cat.id, children))
            if not force:
                qs = qs.filter(Q(image='') | Q(image__isnull=True))
            n = qs.update(image=rel)
            total += n
            self.stdout.write(
                self.style.SUCCESS(f'  {cat.category_name}: {n} 商品に {src.name} を設定')
            )

        self.stdout.write(self.style.SUCCESS(f'合計 {total} 商品に画像を設定しました'))

    @staticmethod
    def _find_image(seed_dir, root):
        for stem in (root.category_code, root.category_name):
            for ext in EXTS:
                p = seed_dir / f'{stem}{ext}'
                if p.exists():
                    return p
        return None

    @staticmethod
    def _children_map():
        children = {}
        for cid, pid in EcCategory.objects.values_list('id', 'parent_id'):
            children.setdefault(pid, []).append(cid)
        return children

    @staticmethod
    def _descendants(root_id, children):
        result, stack = [], [root_id]
        while stack:
            cid = stack.pop()
            result.append(cid)
            stack.extend(children.get(cid, []))
        return result
