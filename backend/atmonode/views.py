from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Node, NodeAccess, Reading
from .serializers import (
    GrantNodeAccessSerializer,
    NodeSerializer,
    ReadingSerializer,
)


class UserOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'email']


class UserListView(generics.ListAPIView):
    serializer_class = UserOptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return get_user_model().objects.exclude(id=self.request.user.id).order_by('email')


class NodeListCreateView(generics.ListCreateAPIView):
    serializer_class = NodeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        location = self.request.query_params.get('location')
        queryset = Node.objects.filter(
            Q(owner=user) | Q(access_entries__user=user)
        ).distinct()

        if location:
            queryset = queryset.filter(location=location)

        return queryset

    def perform_create(self, serializer):
        node = serializer.save(owner=self.request.user)
        NodeAccess.objects.update_or_create(
            node=node,
            user=self.request.user,
            defaults={
                'role': NodeAccess.ROLE_OWNER,
                'granted_by': self.request.user,
            },
        )


class NodeGrantAccessView(generics.GenericAPIView):
    serializer_class = GrantNodeAccessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, node_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            node = Node.objects.get(id=node_id)
        except Node.DoesNotExist:
            return Response({'detail': 'Node not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = NodeAccess.objects.filter(
            node=node,
            user=request.user,
            role=NodeAccess.ROLE_OWNER,
        ).exists() or node.owner_id == request.user.id

        if not is_owner:
            raise PermissionDenied('Only node owner can grant access.')

        User = get_user_model()
        try:
            target_user = User.objects.get(id=serializer.validated_data['user'])
        except User.DoesNotExist:
            return Response({'detail': 'Target user not found.'}, status=status.HTTP_400_BAD_REQUEST)

        access, _ = NodeAccess.objects.update_or_create(
            node=node,
            user=target_user,
            defaults={
                'role': serializer.validated_data['role'],
                'granted_by': request.user,
            },
        )

        return Response(
            {
                'node': node.id,
                'user': access.user_id,
                'role': access.role,
            },
            status=status.HTTP_200_OK,
        )


class ReadingListCreateView(generics.ListCreateAPIView):
    serializer_class = ReadingSerializer
    permission_classes = [permissions.AllowAny]

    def _get_device_token(self):
        header_token = self.request.headers.get('X-Device-Token')
        if header_token:
            return header_token

        auth_header = self.request.headers.get('Authorization', '')
        if auth_header.startswith('Device '):
            return auth_header.split(' ', 1)[1].strip()

        return None

    def _is_valid_device_request(self):
        configured_token = getattr(settings, 'DEVICE_INGEST_TOKEN', '')
        if not configured_token:
            return False
        provided_token = self._get_device_token()
        return provided_token == configured_token

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Reading.objects.none()

        location = self.request.query_params.get('location')

        queryset = Reading.objects.filter(
            Q(node__owner=user) | Q(node__access_entries__user=user)
        ).distinct()

        if location:
            queryset = queryset.filter(node__location=location)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user

        if user.is_authenticated:
            node = serializer.validated_data.get('node')
            if not node:
                device_uid = serializer.validated_data.get('device_uid')
                if not device_uid:
                    raise PermissionDenied('Either node or device_uid is required for authenticated requests.')

                try:
                    node = Node.objects.get(device_uid=device_uid)
                except Node.DoesNotExist:
                    raise PermissionDenied('No registered node found for this device_uid.')

            has_write_access = (
                user.is_superuser
                or user.is_staff
                or node.owner_id == user.id
                or NodeAccess.objects.filter(
                    node=node,
                    user=user,
                    role__in=[NodeAccess.ROLE_OWNER, NodeAccess.ROLE_EDITOR],
                ).exists()
            )

            if not has_write_access:
                raise PermissionDenied('You do not have write access to this node.')

            serializer.save(node=node)
            return

        if not self._is_valid_device_request():
            raise PermissionDenied('Invalid device token.')

        device_uid = serializer.validated_data.get('device_uid')
        if not device_uid:
            raise PermissionDenied('device_uid is required for device ingestion.')

        try:
            node = Node.objects.get(device_uid=device_uid)
        except Node.DoesNotExist:
            raise PermissionDenied('No registered node found for this device_uid.')

        serializer.save(node=node)

















