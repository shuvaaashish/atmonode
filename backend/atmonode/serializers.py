from rest_framework import serializers
from .models import Node, Reading

class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = ['id', 'node', 'temperature', 'humidity', 'timestamp']
        read_only_fields = ['timestamp']
