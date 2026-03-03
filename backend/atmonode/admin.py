from django.contrib import admin
from .models import Node, Reading

@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    # What you see in the list view
    list_display = ('id', 'name', 'owner', 'location', 'created_at')
    # Clickable links
    list_display_links = ('id', 'name')
    # Sidebar filters
    list_filter = ('owner', 'created_at')
    # Search box for names or locations
    search_fields = ('name', 'location')

@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    # Display the most important data points
    list_display = ('id', 'get_node_name', 'temperature', 'humidity', 'timestamp')
    # Filter by node or date (great for checking specific sensors)
    list_filter = ('node', 'timestamp')
    # Make it read-only in admin so you don't accidentally "fake" data
    readonly_fields = ('timestamp',)

    # Helper function to show the node name in the list
    def get_node_name(self, obj):
        return obj.node.name
    get_node_name.short_description = 'Node Name'