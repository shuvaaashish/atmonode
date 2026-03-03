from django.db import migrations


def create_nodeaccess_table_if_missing(apps, schema_editor):
    NodeAccess = apps.get_model('atmonode', 'NodeAccess')
    existing_tables = schema_editor.connection.introspection.table_names()

    if NodeAccess._meta.db_table not in existing_tables:
        schema_editor.create_model(NodeAccess)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('atmonode', '0002_sync_device_uid_schema'),
    ]

    operations = [
        migrations.RunPython(create_nodeaccess_table_if_missing, noop_reverse),
    ]
