from django.db import models
from django.conf import settings

class Node(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Reading(models.Model):
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='readings')
    temperature = models.FloatField()
    humidity = models.FloatField()
    # Using auto_now_add is perfect for time-series graphing
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] # Important for fetching the "latest" data point

    def __str__(self):
        return f"{self.node.name}: {self.temperature}°C at {self.timestamp.strftime('%H:%M:%S')}"