# EC サイト デプロイ手順（WMS と同じ EC2 に相乗り / ec.komaki-wms.com）

構成: ブラウザ → nginx(HTTPS終端) → ┬ React 静的ファイル(`/`)
　　　　　　　　　　　　　　　　　　 └ `/api`・`/admin` → gunicorn(:8001) → EC backend(Django)
DB は既存 RDS の **`ec` データベース**（WMS は `wms`）。EC backend → WMS API はサーバ間で呼ぶ。

```
https://komaki-wms.com      → nginx → gunicorn:8000 → WMS（既存・変更なし）
https://ec.komaki-wms.com   → nginx → gunicorn:8001 → EC backend（新規）＋ React 配信
                                               ↘ https://komaki-wms.com/api/... （WMS を呼ぶ）
RDS: wms データベース（既存） ＋ ec データベース（新規）
```

前提: WMS が既に同 EC2(Ubuntu)＋RDS で稼働済み（`DEPLOY.md` は WMS リポジトリ参照）。
パス例は `ubuntu` ユーザー・`/home/ubuntu/ec`。**追加の AWS リソースは作らない**（EC2・RDS 共用、サブドメインは無料）＝追加コストほぼ 0。

---

## 1. RDS に `ec` データベースとユーザーを作成

EC2 に SSH し、RDS にマスターユーザー（WMS 構築時の `wms_admin`）で接続して作成する。
RDS エンドポイントとマスターパスワードは WMS の `~/wms/.env`（`POSTGRES_HOST` / `POSTGRES_PASSWORD`）で確認できる。

```bash
ssh -i your-key.pem ubuntu@<ElasticIP>

# psql クライアントが無ければ入れる
sudo apt -y install postgresql-client

# RDS にマスターユーザーで接続（パスワードを聞かれる）
psql -h <RDSエンドポイント> -U wms_admin -d postgres

-- ↓ psql の中で実行（パスワードは強いものに）
CREATE ROLE ec LOGIN PASSWORD '<ec用の強いパスワード>';
CREATE DATABASE ec OWNER ec;
\q
```

## 2. DNS: サブドメインを EC2 に向ける

ドメインの DNS に **A レコード** を追加:

```
ec.komaki-wms.com  →  <EC2 の Elastic IP>（komaki-wms.com と同じ IP）
```

反映確認:
```bash
dig +short ec.komaki-wms.com   # Elastic IP が返ればOK
```

## 3. EC リポジトリを取得（EC2 上）

```bash
cd ~
git clone https://github.com/Dev-komaki789/ec.git
cd ec/backend
uv sync                         # backend の依存を .venv に入れる（無ければ uv を先に導入）
```

## 4. backend の `.env`（本番値）

```bash
cd ~/ec/backend
cp .env.example .env
nano .env
```

本番値:
```
DJANGO_SECRET_KEY=<生成した長い文字列>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=ec.komaki-wms.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://ec.komaki-wms.com
# 同一オリジン配信なので CORS は不要（空でよい）
DJANGO_CORS_ALLOWED_ORIGINS=

POSTGRES_DB=ec
POSTGRES_USER=ec
POSTGRES_PASSWORD=<手順1で決めた ec のパスワード>
POSTGRES_HOST=<RDSエンドポイント>     # WMS と同じ
POSTGRES_PORT=5432

# EC backend → WMS の呼び出し先。公開ドメイン経由が手軽（WMS 側の設定変更が不要）。
WMS_BASE_URL=https://komaki-wms.com
# WMS 本番の WMS_API_KEY と「同じ値」にする（~/wms/.env からコピー）
WMS_API_KEY=<WMS本番の WMS_API_KEY>
```

SECRET_KEY の生成:
```bash
uv run python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"
```

> 補足: `WMS_BASE_URL` を `http://127.0.0.1:8000`（サーバ内 localhost）にすると速くなるが、
> その場合は WMS 側 `.env` の `DJANGO_ALLOWED_HOSTS` に `127.0.0.1` を足す必要がある。
> まずは `https://komaki-wms.com` で確実に動かすのがおすすめ。

## 5. DB 初期化・管理者・マスタ同期

```bash
cd ~/ec/backend
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput        # staticfiles/ に admin の静的を集約
uv run python manage.py createsuperuser                # 管理者を作成
uv run python manage.py sync_skus_from_wms             # WMS から商品/カテゴリ/SKU を同期
uv run python manage.py seed_prices                    # 開発用ダミー価格（本番の値が決まったら差替え）
```

## 6. frontend をビルド（静的ファイル生成）

Node を入れて React をビルドする（`dist/` を nginx が配信する）。

```bash
# Node 22 を導入（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
sudo corepack enable                                   # pnpm を使えるようにする

cd ~/ec/frontend
pnpm install
pnpm build                                             # .env.production の VITE_API_BASE_URL=/api/ec でビルド → dist/
```

`dist/index.html` が生成されればOK。API は相対パス `/api/ec` を叩くので同一オリジン（CORS 不要）。

## 7. gunicorn を常駐化（systemd）

```bash
sudo cp ~/ec/backend/deploy/gunicorn-ec.service /etc/systemd/system/gunicorn-ec.service
# パス/ユーザーが違えば編集: sudo nano /etc/systemd/system/gunicorn-ec.service
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn-ec
sudo systemctl status gunicorn-ec      # active (running) を確認（:8001）
```

## 8. nginx の設定

```bash
sudo cp ~/ec/backend/deploy/nginx-ec.conf /etc/nginx/sites-available/ec
# server_name / パスを確認: sudo nano /etc/nginx/sites-available/ec
sudo ln -s /etc/nginx/sites-available/ec /etc/nginx/sites-enabled/ec
sudo nginx -t && sudo systemctl reload nginx
```

ここで `http://ec.komaki-wms.com` が開けばOK（証明書はまだなので次でHTTPS化）。

## 9. HTTPS 化（Let's Encrypt / certbot）

certbot は WMS 構築時に導入済みのはず。サブドメイン分の証明書を取得:

```bash
sudo certbot --nginx -d ec.komaki-wms.com
# 既存の証明書に追加する形。443 と http→https リダイレクトが nginx に自動追記される。
```

完了後 `https://ec.komaki-wms.com` で鍵マーク付きで表示される。
`DJANGO_DEBUG=False` なので Django 側の HTTPS 強制・secure cookie も有効になる。

## 10. 動作確認

- `https://ec.komaki-wms.com/` → 商品一覧が表示される
- 会員登録 → ログイン → カート → 注文確定（→ WMS に出荷指示が作成される）
- `https://ec.komaki-wms.com/admin/` → 管理画面（CSS が当たっていれば collectstatic OK）
- `uv run python manage.py check --deploy` で重大警告が無いこと

---

## 更新（コード修正の反映）

```bash
cd ~/ec
git pull

# backend が変わったとき
cd backend
uv sync                                       # 依存が変わったとき
uv run python manage.py migrate               # モデルが変わったとき
uv run python manage.py collectstatic --noinput   # admin の静的が変わったとき
sudo systemctl restart gunicorn-ec

# frontend が変わったとき
cd ../frontend
pnpm install                                  # 依存が変わったとき
pnpm build                                    # 再ビルド（nginx は dist/ を配信するので reload 不要）
```

## マスタ同期の定期実行（任意）

商品マスタを毎日 WMS から同期する場合は cron に登録:
```bash
crontab -e
# 毎日 2:00 に同期
0 2 * * * cd /home/ubuntu/ec/backend && /home/ubuntu/.local/bin/uv run python manage.py sync_skus_from_wms >> /home/ubuntu/ec-sync.log 2>&1
```

## トラブルシュート

- 500 / 画面が出ない: `sudo journalctl -u gunicorn-ec -n 50`、`.env` の `DEBUG`・`ALLOWED_HOSTS` を確認。
- 商品が出ない/注文できない（WMS 連携失敗）: `WMS_BASE_URL`・`WMS_API_KEY` が WMS 本番と一致しているか。
  `curl -H "Authorization: Bearer <KEY>" https://komaki-wms.com/api/categories/` で WMS API が叩けるか確認。
- DB 接続エラー: RDS の SG が 5432 を EC2 の SG から許可しているか、`.env` のホスト/パスワード。
- 管理画面の CSS 崩れ: `collectstatic` 済みか、nginx の `/static/` の alias パスが合っているか。
- ページ再読み込みで 404: nginx の `try_files $uri /index.html;`（SPA フォールバック）が効いているか。

## コスト管理

- EC2・RDS は WMS と共用なので **EC のための追加課金は基本なし**（同インスタンスの負荷が増えるだけ）。
- 負荷が上がってきたら EC2 のインスタンスタイプを上げる、frontend を S3+CloudFront に出す等を検討。
