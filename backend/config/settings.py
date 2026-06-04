"""
Django settings for config project (EC backend).

EC サイトの backend。React frontend に商品 / カート / 注文 API を提供し、
WMS とは HTTP API（API キー認証）で連携する。設計の真実のソースは
WMS リポジトリの integration/HANDOVER_EC.md。
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# .env を読み込む
load_dotenv(BASE_DIR / '.env')


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()
]

# HTTPS ドメインからの POST を CSRF で弾かれないよう許可する（Django 4 以降は HTTPS で必須）。
# 例: DJANGO_CSRF_TRUSTED_ORIGINS=https://ec.komaki-wms.com
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    # EC apps（モデル定義時にここへ追加していく: catalog / customers / orders など）
    'catalog',
    'customers',
    'orders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # CorsMiddleware は「レスポンスを生成する他のミドルウェア」より上に置く必要がある
    # （django-cors-headers 公式ドキュメントの推奨配置）。
    'corsheaders.middleware.CorsMiddleware',
    # WhiteNoise は SecurityMiddleware の直後（本番で静的ファイルを配信する）
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# 物理的には WMS と同じ Postgres（本番は同じ RDS インスタンス）だが、論理的に別データベース "ec"。
# WMS の "wms" データベースとは FK / JOIN 不可。WMS との連携は HTTP API 経由のみ。

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['POSTGRES_DB'],
        'USER': os.environ['POSTGRES_USER'],
        'PASSWORD': os.environ['POSTGRES_PASSWORD'],
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'ja'

TIME_ZONE = 'Asia/Tokyo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
# collectstatic の集約先（生成物。本番で配信する単一フォルダ）。.gitignore 済み。
STATIC_ROOT = BASE_DIR / 'staticfiles'

# 商品画像のアップロード先。
# フェーズ1（初期）: ローカル media/ ディレクトリ。
# フェーズ2（本番）: django-storages で S3 に切り替え（STORAGES の default を差し替える）。
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 本番のみ WhiteNoise のハッシュ付き・圧縮配信を使う（開発は標準ストレージのまま）。
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': (
            'django.contrib.staticfiles.storage.StaticFilesStorage'
            if DEBUG
            else 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        ),
    },
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# === 本番（DEBUG=False）でのみ有効化するセキュリティ設定 ===
# nginx が HTTPS を終端し、内部は HTTP で gunicorn に転送する構成を前提にする。
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 86400
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


# === REST Framework / OpenAPI (drf-spectacular) ===
# React frontend に商品 / 在庫 / カート / 注文 API を提供する。
# 顧客認証は JWT（djangorestframework-simplejwt）を採用。トークンを Authorization
# ヘッダで送る方式なので、別オリジンの SPA（:5173）からでも Cookie/CSRF 不要で扱える。
# 既定の権限は AllowAny（商品一覧など公開 API）。カート・注文・顧客系の保護したい
# ビューだけ permission_classes=[IsAuthenticated] を個別に付ける。
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}

# === JWT（simplejwt）===
# access: 短命（毎リクエストに付ける本体）。expire したら refresh で取り直す。
# refresh: 長命（access を再発行するための引換券）。
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'EC サイト API',
    'DESCRIPTION': 'React frontend 向けの EC API（商品一覧・商品詳細・在庫照会・カート・注文）。',
    'VERSION': '0.1.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# === WMS 連携（EC backend → WMS backend の HTTP 呼び出し） ===
# 在庫照会（get_stock）と出荷指示作成で WMS の API を叩く。サービス間認証は API キー。
# WMS へのリクエストに Authorization: Bearer <WMS_API_KEY> を付与する。
WMS_BASE_URL = os.environ.get('WMS_BASE_URL', 'http://localhost:8000')
WMS_API_KEY = os.environ.get('WMS_API_KEY', '')


# === CORS（EC frontend からの API 呼び出しを許可） ===
# 本番は環境変数 DJANGO_CORS_ALLOWED_ORIGINS で許可オリジンを指定する。
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get('DJANGO_CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
]

# 開発時（DEBUG=True）は Vite のデフォルトポート(5173)等を許可する。
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ]
