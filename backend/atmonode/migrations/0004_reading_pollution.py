from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('atmonode', '0003_sync_nodeaccess_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='reading',
            name='pollution',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
