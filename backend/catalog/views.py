"""商品カタログ API のビュー。

ReadOnlyModelViewSet なので一覧（GET /api/ec/products/）と
詳細（GET /api/ec/products/{id}/）の両方を提供する。どちらも EC 自身の DB だけで
完結し、WMS には問い合わせない（在庫数だけは別 API）。
"""

from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EcCategory, EcProduct, EcSku
from .serializers import EcCategorySerializer, EcProductSerializer
from .wms_client import StockNotFound, WmsUnavailable, get_stock


class ProductPagination(PageNumberPagination):
    """商品一覧用のページング。1 ページ 12 件（グリッドが 2/3/4 列で割り切れる数）。

    フロント側のページ数計算もこの 12 を前提にしているので、変える場合は
    frontend/src/api/catalog.ts の PRODUCT_PAGE_SIZE も合わせる。
    """

    page_size = 12


class CategoryListView(ListAPIView):
    """カテゴリ一覧（有効なもの全件）。frontend がツリーを組み立てて絞り込みに使う。

    GET /api/ec/categories/
    """

    queryset = EcCategory.objects.filter(is_active=True).order_by('sort_order', 'category_code')
    serializer_class = EcCategorySerializer
    pagination_class = None  # カテゴリは少数なので全件返す


class EcProductViewSet(viewsets.ReadOnlyModelViewSet):
    """商品一覧 / 商品詳細。

    クエリパラメータ:
      - category: カテゴリコード（例: ?category=CAT-001-01）で絞り込み
      - search:   商品名・商品コードの部分一致
    """

    serializer_class = EcProductSerializer
    pagination_class = ProductPagination

    def get_queryset(self):
        # JOIN を 1 度にまとめて N+1 を避ける:
        #   category は select_related（FK 先を JOIN）、
        #   skus と各 sku の price は prefetch_related（別クエリでまとめ取り）。
        qs = (
            EcProduct.objects.filter(is_active=True)
            .select_related('category')
            .prefetch_related('skus__price')
            .order_by('product_code')
        )

        # カテゴリ絞り込み: 指定カテゴリ「とその子孫」に属する商品を返す。
        # （商品は末端カテゴリに付くので、親カテゴリを選んだら配下すべてを見せたい）
        category_code = self.request.query_params.get('category')
        if category_code:
            root = EcCategory.objects.filter(category_code=category_code).first()
            if root is None:
                qs = qs.none()
            else:
                qs = qs.filter(category_id__in=self._descendant_ids(root.id))

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q

            qs = qs.filter(Q(product_name__icontains=search) | Q(product_code__icontains=search))

        return qs

    @staticmethod
    def _descendant_ids(root_id):
        """root_id とその全子孫カテゴリの id を返す（メモリ上で木を辿る）。"""
        rows = EcCategory.objects.values_list('id', 'parent_id')
        children = {}
        for cid, pid in rows:
            children.setdefault(pid, []).append(cid)
        result, stack = [], [root_id]
        while stack:
            cid = stack.pop()
            result.append(cid)
            stack.extend(children.get(cid, []))
        return result


class StockView(APIView):
    """SKU の現在在庫数を返す（段階1: 都度 WMS に問い合わせ / HANDOVER §7）。

    GET /api/ec/stock/?sku_code=SKU-000001
      → { "sku_code": "SKU-000001", "stock": 42 }

    商品一覧 API に在庫を埋め込まないのは、一覧表示のたびに WMS を叩かないため。
    在庫はこのエンドポイントで必要なときだけ取りに行く。
    """

    def get(self, request):
        sku_code = request.query_params.get('sku_code')
        if not sku_code:
            return Response(
                {'error': 'validation_error', 'message': 'sku_code は必須です'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # EC が知らない SKU なら WMS を叩く前に 404 を返す（無駄な問い合わせを避ける）。
        if not EcSku.objects.filter(sku_code=sku_code, is_active=True).exists():
            return Response(
                {'error': 'not_found', 'message': f'SKU {sku_code} は存在しません'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            stock = get_stock(sku_code)
        except StockNotFound:
            return Response(
                {'error': 'not_found', 'message': f'SKU {sku_code} は WMS に存在しません'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except WmsUnavailable:
            # WMS 障害時。EC 自体は生きているので 503（一時的に利用不可）を返す。
            return Response(
                {'error': 'wms_unavailable', 'message': '在庫の取得に失敗しました'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'sku_code': sku_code, 'stock': stock})
