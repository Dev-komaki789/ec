"""会員登録 / ログイン(JWT) / プロフィール取得・更新のテスト。"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from customers.models import CustomerProfile

User = get_user_model()


class AuthTests(APITestCase):
    def _register(self, email='a@example.com', full_name='Aさん'):
        return self.client.post(
            '/api/ec/auth/register/',
            {'email': email, 'password': 'pass12345', 'full_name': full_name},
            format='json',
        )

    def _login(self, email='a@example.com'):
        res = self.client.post(
            '/api/ec/auth/token/',
            {'username': email, 'password': 'pass12345'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
        return res

    def test_register_creates_user_and_profile(self):
        res = self._register()
        self.assertEqual(res.status_code, 201)
        # username=email になっている
        self.assertTrue(User.objects.filter(username='a@example.com').exists())
        self.assertTrue(CustomerProfile.objects.filter(full_name='Aさん').exists())

    def test_register_duplicate_email(self):
        self._register()
        res = self._register(full_name='別の人')
        self.assertEqual(res.status_code, 400)

    def test_login_and_me(self):
        self._register()
        login = self._login()
        self.assertEqual(login.status_code, 200)
        self.assertIn('access', login.data)

        me = self.client.get('/api/ec/auth/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['email'], 'a@example.com')

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get('/api/ec/auth/me/').status_code, 401)

    def test_profile_update(self):
        self._register()
        self._login()
        res = self.client.patch(
            '/api/ec/auth/me/',
            {'address': '東京都港区9-9', 'phone_number': '03-1111-2222'},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['address'], '東京都港区9-9')
        # DB にも反映
        profile = CustomerProfile.objects.get(user__username='a@example.com')
        self.assertEqual(profile.phone_number, '03-1111-2222')
