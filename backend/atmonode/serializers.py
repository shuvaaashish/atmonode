from rest_framework import serializers
from .models import Node, Reading, NodeAccess


class NodeAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = NodeAccess
        fields = ['id', 'user', 'role', 'granted_by', 'created_at']
        read_only_fields = ['id', 'granted_by', 'created_at']


class NodeSerializer(serializers.ModelSerializer):
    access_entries = NodeAccessSerializer(many=True, read_only=True)

    class Meta:
        model = Node
        fields = ['id', 'owner', 'name', 'device_uid', 'location', 'created_at', 'access_entries']
        read_only_fields = ['id', 'owner', 'created_at', 'access_entries']


class GrantNodeAccessSerializer(serializers.Serializer):
    user = serializers.IntegerField()
    role = serializers.ChoiceField(choices=[
        NodeAccess.ROLE_OWNER,
        NodeAccess.ROLE_EDITOR,
        NodeAccess.ROLE_VIEWER,
    ])

    def create(self, validated_data):
        return validated_data

    def update(self, instance, validated_data):
        return validated_data

class ReadingSerializer(serializers.ModelSerializer):
    device_uid = serializers.CharField(write_only=True, required=False)
    pollution = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Reading
        fields = ['id', 'node', 'device_uid', 'temperature', 'humidity', 'pollution', 'timestamp']
        read_only_fields = ['timestamp']
        extra_kwargs = {
            'node': {'required': False},
        }

    def create(self, validated_data):
        validated_data.pop('device_uid', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('device_uid', None)
        return super().update(instance, validated_data)
