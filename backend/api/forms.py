from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from .models import User


class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="Password", required=False, widget=forms.PasswordInput)
    password2 = forms.CharField(label="Password confirmation", required=False, widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")

        if password1 or password2:  
            if password1 != password2:
                raise forms.ValidationError("Passwords don't match")
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
    password = ReadOnlyPasswordHashField(label=("Password"), required=False)

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "role", "is_active", "is_staff")

    
    

