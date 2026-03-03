from django.urls import path
from .views import ReadingListCreateView

urlpatterns = [
    path('readings/', ReadingListCreateView.as_view(), name='reading-list'),
]