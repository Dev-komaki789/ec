"""WMS backend の HTTP API を叩くためのクライアント。

サービス間認証は API キー（Authorization: Bearer <WMS_API_KEY>）。
ベース URL とキーは settings（= .env）から読む。

ここに置くのは:
- fetch_list … マスタ同期で使う「一覧取得（ページング対応）」
- get_stock  … 在庫照会（段階1: 都度 WMS に問い合わせ）
注文連携（POST /orders/）は、注文機能を作るときに同じ方針でここに足していく。
"""

import requests
from django.conf import settings


class StockNotFound(Exception):
    """指定 SKU が WMS 側に存在しない（在庫照会で 404）。"""


class WmsUnavailable(Exception):
    """WMS に繋がらない / エラー応答（タイムアウト・5xx 等）。"""


class StockShortage(Exception):
    """注文時に WMS 側で在庫不足（409）。"""

    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


# WMS の API は /api/ 配下（例: /api/categories/, /api/skus/）。
# 実装が真実のソース。Swagger: <WMS_BASE_URL>/api/schema/swagger-ui/
API_PREFIX = '/api'

# WMS が無応答だと同期が固まるので必ずタイムアウトを付ける（接続/読み取り秒）。
DEFAULT_TIMEOUT = (5, 30)


def _auth_headers():
    return {'Authorization': f'Bearer {settings.WMS_API_KEY}'}


def fetch_list(path, params=None):
    """WMS のページング付き一覧 API を全ページ取得して results を順に yield する。

    DRF PageNumberPagination 形式（{count, next, previous, results}）を前提に、
    next が null になるまで page を辿る。

    path 例: '/categories/' → 実際に叩くのは <WMS_BASE_URL>/api/categories/
    """
    url = f'{settings.WMS_BASE_URL}{API_PREFIX}{path}'
    params = dict(params or {})
    while url:
        resp = requests.get(url, headers=_auth_headers(), params=params, timeout=DEFAULT_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        yield from data.get('results', [])
        # 2 ページ目以降は next の完全 URL をそのまま使う（page 等は URL に含まれる）。
        url = data.get('next')
        params = None


def get_stock(sku_code):
    """SKU の現在在庫数（全ロケーション合計）を返す。

    段階1（HANDOVER §5）の実装。在庫を使う側（ビュー/シリアライザ）は直接
    requests を書かず、必ずこの関数を経由する。将来 Redis キャッシュを入れる
    ときは、この関数の中で「キャッシュにあれば返す / 無ければ取得して保存」に
    差し替えれば、呼び出し側を変えずに全箇所がキャッシュ経由になる。
    """
    return _fetch_stock_from_wms(sku_code)


def _fetch_stock_from_wms(sku_code):
    """WMS の GET /api/stock/{sku_code}/ を叩いて在庫数(int)を取り出す。"""
    url = f'{settings.WMS_BASE_URL}{API_PREFIX}/stock/{sku_code}/'
    try:
        resp = requests.get(url, headers=_auth_headers(), timeout=DEFAULT_TIMEOUT)
    except requests.RequestException as e:
        # 接続不可・タイムアウト等。呼び出し側で 503 等に変換する。
        raise WmsUnavailable(str(e)) from e

    if resp.status_code == 404:
        raise StockNotFound(sku_code)
    if resp.status_code >= 500:
        raise WmsUnavailable(f'WMS returned {resp.status_code}')
    resp.raise_for_status()

    return resp.json()['stock']


def create_outbound_order(
    external_order_id,
    delivery_name,
    delivery_address,
    items,
    delivery_postal_code='',
    note='',
):
    """WMS に出荷指示を作成する（POST /api/orders/）。注文確定時に呼ぶ。

    items: [{'sku_code': 'SKU-000001', 'quantity': 3}, ...]

    戻り値（成功 201）:
        {'outbound_order_code': 'OMS-...', 'status': 'inspection_wait', 'external_order_id': ...}
    例外:
        StockShortage … 在庫不足（WMS が 409）。WMS 側はロールバック済み。
        WmsUnavailable … 接続不可・タイムアウト・5xx。
    """
    url = f'{settings.WMS_BASE_URL}{API_PREFIX}/orders/'
    payload = {
        'external_order_id': external_order_id,
        'delivery_name': delivery_name,
        'delivery_postal_code': delivery_postal_code,
        'delivery_address': delivery_address,
        'items': items,
        'note': note,
    }
    try:
        resp = requests.post(url, json=payload, headers=_auth_headers(), timeout=DEFAULT_TIMEOUT)
    except requests.RequestException as e:
        raise WmsUnavailable(str(e)) from e

    if resp.status_code == 409:
        data = resp.json()
        raise StockShortage(data.get('message', '在庫が不足しています'), data.get('details'))
    if resp.status_code >= 500:
        raise WmsUnavailable(f'WMS returned {resp.status_code}')
    resp.raise_for_status()

    return resp.json()
