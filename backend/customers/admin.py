from django.contrib import admin

from .models import CustomerProfile


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'postal_code', 'phone_number', 'created_at')
    search_fields = ('full_name', 'user__email', 'user__username')
