import os

from storages.backends.s3boto3 import S3Boto3Storage


class ProfilePicStorage(S3Boto3Storage):
    location = os.getenv("LOCATION_FOLDER_FOR_USER_PIC", "profile_pics/")
    file_overwrite = False
    default_acl = None


class BookStorage(S3Boto3Storage):
    location = os.getenv("LOCATION_FOLDER_FOR_SUBJECT_BOOK", "subject_books/")
    file_overwrite = False
    default_acl = None  # keep private (IMPORTANT)
