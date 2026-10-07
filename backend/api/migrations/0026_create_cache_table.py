from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    # OTP codes are stored in the database cache (settings.CACHES); create its
    # table as part of `migrate` so no separate `createcachetable` step is needed.
    # No-op when the configured cache isn't database-backed.
    call_command("createcachetable", database=schema_editor.connection.alias, verbosity=0)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0025_remove_exam_sign_name_remove_question_sign_name_and_more"),
    ]

    operations = [
        migrations.RunPython(create_cache_table, migrations.RunPython.noop),
    ]
