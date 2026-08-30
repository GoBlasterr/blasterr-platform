import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminContent, 
  useUpdateAdminContent, 
  useDeleteAdminContent,
  getGetAdminContentQueryKey,
  getGetAdminAuditLogQueryKey,
  getGetAdminAnalyticsQueryKey,
  AdminContentUpdateStatus
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, EyeOff, Eye, Trash2, ShieldAlert } from "lucide-react";

export default function ContentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError, error } = useGetAdminContent();
  const updateContent = useUpdateAdminContent();
  const deleteContent = useDeleteAdminContent();

  const isPending = updateContent.isPending || deleteContent.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content</h1>
          <p className="text-muted-foreground mt-1">Moderate Blasts.</p>
        </div>
        <Card className="rounded-sm">
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent><div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div></CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminContentQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminAnalyticsQueryKey() });
  };

  const handleUpdateStatus = (id: string, status: AdminContentUpdateStatus) => {
    updateContent.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "Status updated", description: "Content status has been updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this blast?")) return;
    deleteContent.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "Content deleted", description: "Blast has been permanently removed." });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete content.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Content</h1>
          <p className="text-muted-foreground mt-1 text-sm">Moderate Blasts.</p>
        </div>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Blasts ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px] font-mono text-xs">CONTENT</TableHead>
                <TableHead className="font-mono text-xs">AUTHOR</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
                <TableHead className="font-mono text-xs">REPORTS</TableHead>
                <TableHead className="font-mono text-xs text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    NO_CONTENT_FOUND
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((item) => (
                  <TableRow key={item.id} data-testid={`row-content-${item.id}`}>
                    <TableCell>
                      <div className="line-clamp-2 text-sm max-w-md">{item.content}</div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">Target: {item.target.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-sm">@{item.author.username}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'published' ? "outline" : "destructive"} className="font-mono text-[10px] rounded-sm uppercase">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.reportCount > 0 ? (
                        <span className="flex items-center gap-1 text-destructive font-mono text-sm font-bold">
                          <ShieldAlert className="w-3 h-3" /> {item.reportCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isPending} className="h-8 w-8 rounded-sm" data-testid={`button-actions-${item.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm font-mono text-xs">
                          {item.status === 'published' ? (
                            <DropdownMenuItem disabled={isPending} onClick={() => handleUpdateStatus(item.id, 'hidden')} data-testid={`action-hide-${item.id}`}>
                              <EyeOff className="w-4 h-4 mr-2" /> Hide Content
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled={isPending} onClick={() => handleUpdateStatus(item.id, 'published')} data-testid={`action-publish-${item.id}`}>
                              <Eye className="w-4 h-4 mr-2" /> Publish Content
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem disabled={isPending} onClick={() => handleDelete(item.id)} data-testid={`action-delete-${item.id}`}>
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            <span className="text-destructive">Delete Content</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}