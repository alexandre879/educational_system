from storages.backends.s3boto3 import S3Boto3Storage
from decouple import config

class ProfilePicStorage(S3Boto3Storage):
    location = config('LOCATION_FOLDER')
    default_acl = 'public-read'
    file_overwrite = False
    default_acl = None