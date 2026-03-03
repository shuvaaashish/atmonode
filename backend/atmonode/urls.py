from django.urls import path
from .views import NodeGrantAccessView, NodeListCreateView, ReadingListCreateView, UserListView

urlpatterns = [
    path('users/', UserListView.as_view(), name='user-list'),
    path('nodes/', NodeListCreateView.as_view(), name='node-list'),
    path('nodes/<int:node_id>/grant-access/', NodeGrantAccessView.as_view(), name='node-grant-access'),
    path('readings/', ReadingListCreateView.as_view(), name='reading-list'),
]