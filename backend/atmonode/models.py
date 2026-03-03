from django.db import models
from django.conf import settings

class Node(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    owners = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='NodeAccess',
        through_fields=('node', 'user'),
        related_name='accessible_nodes'
    )
    name = models.CharField(max_length=100, unique=True)
    device_uid = models.CharField(max_length=32, unique=True, null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class NodeAccess(models.Model):
    ROLE_OWNER = 'owner'
    ROLE_EDITOR = 'editor'
    ROLE_VIEWER = 'viewer'

    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_EDITOR, 'Editor'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='access_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='node_access_entries')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='granted_node_access_entries'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('node', 'user')

    def __str__(self):
        return f"{self.user} -> {self.node} ({self.role})"

class Reading(models.Model):
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='readings')
    temperature = models.FloatField()
    humidity = models.FloatField()
    # Using auto_now_add is perfect for time-series graphing
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] # Important for fetching the "latest" data point

    def __str__(self):
        node_name = str(self.node.name)
        return f"{node_name}: {self.temperature}°C"