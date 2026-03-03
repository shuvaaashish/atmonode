from django.contrib import admin
from .models import Node, NodeAccess, Reading


class NodeAccessInline(admin.TabularInline):
    model = NodeAccess
    fk_name = 'node'
    extra = 0
    autocomplete_fields = ('user', 'granted_by')

@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    inlines = [NodeAccessInline]
    # What you see in the list view
    list_display = ('id', 'name', 'device_uid', 'owner', 'owners_display', 'location', 'created_at')
    # Clickable links
    list_display_links = ('id', 'name')
    # Sidebar filters
    list_filter = ('owner', 'created_at')
    # Search box for names or locations
    search_fields = ('name', 'device_uid', 'location')
    readonly_fields = ('owners_display', 'created_at')
    fields = ('name', 'device_uid', 'owner', 'location', 'owners_display', 'created_at')

    def owners_display(self, obj):
        if not obj.pk:
            return '-'
        owners = obj.access_entries.select_related('user').all()
        if not owners:
            return '-'
        return ', '.join(f"{entry.user.email} ({entry.role})" for entry in owners)

    owners_display.short_description = 'Owners / Access'

@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    # Display the most important data points
    list_display = ('id', 'get_node_name', 'temperature', 'humidity', 'pollution', 'timestamp')
    # Filter by node or date (great for checking specific sensors)
    list_filter = ('node', 'timestamp')
    # Make it read-only in admin so you don't accidentally "fake" data
    readonly_fields = ('timestamp',)

    # Helper function to show the node name in the list
    def get_node_name(self, obj):
        return obj.node.name
    get_node_name.short_description = 'Node Name'


@admin.register(NodeAccess)
class NodeAccessAdmin(admin.ModelAdmin):
    list_display = ('id', 'node', 'user', 'role', 'granted_by', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('node__name', 'user__email', 'granted_by__email')
    autocomplete_fields = ('node', 'user', 'granted_by')