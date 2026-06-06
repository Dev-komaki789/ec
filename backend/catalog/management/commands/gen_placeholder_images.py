"""開発用: ルートカテゴリの仮画像（プレースホルダ）を seed_images/categories/ に生成する。

商品 100 点に個別画像を用意しない代わりに、カテゴリごとの色分けプレースホルダ
（背景色＋カテゴリ名）を割り当てて、一覧が寂しくならないようにする（デモ用途）。

    uv run python manage.py gen_placeholder_images          # 無い分だけ生成
    uv run python manage.py gen_placeholder_images --force  # 既存も作り直す
"""

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw, ImageFont

from catalog.models import EcCategory

# 日本語を描けるフォント候補（WSL なら Windows 側の Noto が使える）。
FONT_CANDIDATES = [
    '/mnt/c/Windows/Fonts/NotoSansJP-VF.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]

# ルートカテゴリの並び順に割り当てる配色（背景色）。
PALETTE = [
    (37, 99, 235),  # blue
    (5, 150, 105),  # emerald
    (217, 119, 6),  # amber
    (225, 29, 72),  # rose
    (79, 70, 229),  # indigo
]

SIZE = 800


class Command(BaseCommand):
    help = '開発用: ルートカテゴリの仮画像を seed_images/categories/ に生成する'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='既存の画像も作り直す')

    def handle(self, *args, **options):
        out_dir = settings.BASE_DIR / 'seed_images' / 'categories'
        out_dir.mkdir(parents=True, exist_ok=True)

        font_path = next((p for p in FONT_CANDIDATES if Path(p).exists()), None)
        if font_path is None:
            self.stderr.write('日本語フォントが見つからないため英数字のみで描画します')

        roots = EcCategory.objects.filter(parent__isnull=True).order_by(
            'sort_order', 'category_code'
        )
        for i, root in enumerate(roots):
            dest = out_dir / f'{root.category_code}.png'
            if dest.exists() and not options['force']:
                self.stdout.write(f'  skip {dest.name}（既存）')
                continue
            self._draw(dest, root, PALETTE[i % len(PALETTE)], font_path)
            self.stdout.write(self.style.SUCCESS(f'  生成 {dest.name}（{root.category_name}）'))

    def _draw(self, dest, root, color, font_path):
        img = Image.new('RGB', (SIZE, SIZE), color)
        draw = ImageDraw.Draw(img)

        # 下部に少し濃いめの帯を敷いて文字を見やすくする。
        darker = tuple(int(c * 0.8) for c in color)
        draw.rectangle([0, SIZE - 200, SIZE, SIZE], fill=darker)

        big = self._font(font_path, 72)
        small = self._font(font_path, 30)

        # カテゴリ名を中央に。
        name = root.category_name
        bbox = draw.textbbox((0, 0), name, font=big)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((SIZE - w) / 2, (SIZE - h) / 2 - 30), name, font=big, fill='white')

        # 左下にカテゴリコード。
        draw.text((40, SIZE - 70), root.category_code, font=small, fill=(255, 255, 255))
        img.save(dest)

    @staticmethod
    def _font(font_path, size):
        if font_path:
            try:
                return ImageFont.truetype(font_path, size)
            except OSError:
                pass
        return ImageFont.load_default()
