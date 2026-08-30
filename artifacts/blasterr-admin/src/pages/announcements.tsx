import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminAnnouncements, 
  useCreateAdminAnnouncement,
  useUpdateAdminAnnouncement,
  useDeleteAdminAnnouncement,
  getGetAdminAnnouncementsQueryKey,
  getGetAdminAuditLogQueryKey,
  AdminAnnouncementStatus,
  AdminAnnouncementAudience
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Trash2, Megaphone, Plus, Edit2, X } from "lucide-react";
import { format } from "date-fns";

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: announcements, isLoading, isError, error } = useGetAdminAnnouncements();
  const createAnn = useCreateAdminAnnouncement();
  const updateAnn = useUpdateAdminAnnouncement();
  const deleteAnn = useDeleteAdminAnnouncement();

  const isPending = createAnn.isPending || updateAnn.isPending || deleteAnn.isPending;

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    audience: AdminAnnouncementAudience;
    status: AdminAnnouncementStatus;
  }>({
    title: "",
    message: "",
    audience: "all",
    status: "draft"
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">Manage platform announcements.</p>
        </div>
        <Card className="rounded-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !announcements) {
    return <AdminErrorState error={error} />;
  }

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminAnnouncementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
  };

  const handleStartCreate = () => {
    setFormData({ title: "", message: "", audience: "all", status: "draft" });
    setEditingId(null);
    setIsCreating(true);
  };

  const handleStartEdit = (ann: any) => {
    setFormData({ title: ann.title, message: ann.message, audience: ann.audience, status: ann.status });
    setEditingId(ann.id);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateAnn.mutate(
        { id: editingId, data: formData },
        {
          onSuccess: () => {
            invalidateRelated();
            toast({ title: "Updated", description: "Announcement updated." });
            handleCancel();
          },
          onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" })
        }
      );
    } else {
      createAnn.mutate(
        { data: formData },
        {
          onSuccess: () => {
            invalidateRelated();
            toast({ title: "Created", description: "Announcement created." });
            handleCancel();
          },
          onError: () => toast({ title: "Error", description: "Failed to create.", variant: "destructive" })
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    deleteAnn.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "Deleted", description: "Announcement deleted." });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Announcements</h1>
          <p className="text-muted-foreground mt-1 text-sm">Communicate with users.</p>
        </div>
        {!isCreating && (
          <Button onClick={handleStartCreate} disabled={isPending} className="rounded-sm font-mono tracking-wide">
            <Plus className="w-4 h-4 mr-2" /> NEW_BROADCAST
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="rounded-sm border-border shadow-none mb-6 border-primary/20">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b bg-muted/10 px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-mono uppercase tracking-wider text-sm">
                {editingId ? "Edit Announcement" : "Create Announcement"}
              </CardTitle>
              <Button type="button" variant="ghost" size="icon" disabled={isPending} onClick={handleCancel} className="h-8 w-8 rounded-sm">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase">Title</Label>
                <Input 
                  required 
                  disabled={isPending}
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="rounded-sm font-mono text-sm"
                  placeholder="System Maintenance Notice"
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase">Message</Label>
                <Textarea 
                  required 
                  disabled={isPending}
                  value={formData.message} 
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="rounded-sm font-mono text-sm min-h-[100px]"
                  placeholder="Enter details..."
                  data-testid="input-message"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Audience</Label>
                  <Select disabled={isPending} value={formData.audience} onValueChange={(v: AdminAnnouncementAudience) => setFormData({...formData, audience: v})}>
                    <SelectTrigger className="rounded-sm font-mono text-sm" data-testid="select-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm font-mono text-sm">
                      <SelectItem value="all">ALL USERS</SelectItem>
                      <SelectItem value="admins">ADMINS ONLY</SelectItem>
                      <SelectItem value="moderators">MODERATORS ONLY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Status</Label>
                  <Select disabled={isPending} value={formData.status} onValueChange={(v: AdminAnnouncementStatus) => setFormData({...formData, status: v})}>
                    <SelectTrigger className="rounded-sm font-mono text-sm" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-sm font-mono text-sm">
                      <SelectItem value="draft">DRAFT</SelectItem>
                      <SelectItem value="published">PUBLISHED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={isPending} onClick={handleCancel} className="rounded-sm font-mono">CANCEL</Button>
              <Button type="submit" disabled={isPending} className="rounded-sm font-mono">
                {editingId ? "SAVE_CHANGES" : "CREATE_BROADCAST"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.length === 0 && !isCreating ? (
          <Card className="rounded-sm border-dashed text-center py-12 shadow-none">
            <Megaphone className="w-12 h-12 mx-auto text-muted/50 mb-4" />
            <p className="font-mono text-muted-foreground uppercase text-sm">NO_ANNOUNCEMENTS</p>
          </Card>
        ) : (
          announcements.map(ann => (
            <Card key={ann.id} className="rounded-sm border-border shadow-none" data-testid={`card-ann-${ann.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{ann.title}</h3>
                    <div className="flex gap-2 items-center text-xs font-mono text-muted-foreground uppercase">
                      <span>{format(new Date(ann.updatedAt), "yyyy-MM-dd HH:mm")}</span>
                      <span>•</span>
                      <Badge variant="outline" className="font-mono text-[10px] rounded-sm">{ann.audience}</Badge>
                      <Badge variant={ann.status === 'published' ? "default" : "secondary"} className="font-mono text-[10px] rounded-sm">
                        {ann.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={isPending} className="rounded-sm h-8 px-2 font-mono text-xs" onClick={() => handleStartEdit(ann)} data-testid={`action-edit-${ann.id}`}>
                      <Edit2 className="w-3 h-3 mr-2" /> EDIT
                    </Button>
                    <Button variant="destructive" size="sm" disabled={isPending} className="rounded-sm h-8 px-2 font-mono text-xs" onClick={() => handleDelete(ann.id)} data-testid={`action-delete-${ann.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm p-4 bg-muted/30 rounded-sm border">
                  {ann.message}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}