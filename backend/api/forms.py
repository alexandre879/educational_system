from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from unfold.forms import UnfoldReadOnlyPasswordHashWidget
from unfold.widgets import UnfoldAdminPasswordWidget

from .models import User


class UserCreationForm(forms.ModelForm):
    # Optional: people sign in with a Telegram code, so most accounts never get a password.
    password1 = forms.CharField(
        label=_("Password"),
        required=False,
        widget=UnfoldAdminPasswordWidget(attrs={"autocomplete": "new-password"}),
    )
    password2 = forms.CharField(
        label=_("Password confirmation"),
        required=False,
        widget=UnfoldAdminPasswordWidget(attrs={"autocomplete": "new-password"}),
    )

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")

        if password1 or password2:
            if password1 != password2:
                raise forms.ValidationError(_("Passwords don't match"))
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("password1")
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(label=_("Password"), required=False, widget=UnfoldReadOnlyPasswordHashWidget)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "is_active", "is_staff")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        password = self.fields.get("password")
        if password:
            password.help_text = format_html(
                '{} <a href="../password/" class="text-primary-600 dark:text-primary-500">{}</a>',
                _("Passwords are stored encrypted, so nobody can read them."),
                _("Set a new password"),
            )
