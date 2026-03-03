# Create your views here


from rest_framework import generics, permissions
from .models import Node, Reading
from .serializers import ReadingSerializer

class ReadingListCreateView(generics.ListCreateAPIView):
    queryset = Reading.objects.all()
    serializer_class = ReadingSerializer
    # This ensures only people with a Token can send/see data
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # You can add logic here to auto-assign nodes if needed
        serializer.save()

















