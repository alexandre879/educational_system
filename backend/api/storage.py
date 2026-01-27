import os
from storages.backends.s3boto3 import S3Boto3Storage
from dotenv import load_dotenv

load_dotenv()

class ProfilePicStorage(S3Boto3Storage):
    location = os.getenv('LOCATION_FOLDER')
    default_acl = 'public-read'
    file_overwrite = False
    default_acl = None