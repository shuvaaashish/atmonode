from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('atmonode', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "ALTER TABLE atmonode_node "
                "ADD COLUMN IF NOT EXISTS device_uid varchar(32);"
                "CREATE UNIQUE INDEX IF NOT EXISTS atmonode_node_device_uid_uniq "
                "ON atmonode_node (device_uid);"
            ),
            reverse_sql=(
                "DROP INDEX IF EXISTS atmonode_node_device_uid_uniq;"
                "ALTER TABLE atmonode_node DROP COLUMN IF EXISTS device_uid;"
            ),
        ),
    ]
