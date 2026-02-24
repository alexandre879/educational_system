import os
from storages.backends.s3boto3 import S3Boto3Storage
from dotenv import load_dotenv

load_dotenv()

class ProfilePicStorage(S3Boto3Storage):
    location = os.getenv('LOCATION_FOLDER_FOR_USER_PIC')
    default_acl = 'public-read'
    file_overwrite = False
    default_acl = None
    
    
    
class BookStorage(S3Boto3Storage):
    location = os.getenv('LOCATION_FOLDER_FOR_SUBJECT_BOOK')
    file_overwrite = False
    default_acl = None   # keep private (IMPORTANT)