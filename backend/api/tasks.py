# from celery import shared_task
# from django.utils import timezone
# from .models import UserExamSession

# @shared_task
# def expire_sessions():
#     now = timezone.now()
#     updated_count = UserExamSession.objects.filter(
#         active=True,    
#         ends_at__lte=now
#     ).update(active=False, finished=True)
    
#     return updated_count