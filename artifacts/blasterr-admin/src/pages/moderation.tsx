import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminModeration,
  useCreateAdminModerationAction,
  getGetAdminModerationQueryKey,
  getGetAdminReportsQueryKey,
  getGetAdminContentQueryKey,
  getGetAdminUsersQueryKey,
  getGetAdminAuditLogQueryKey,
  getGetAdminAnalyticsQueryKey,
  AdminModerationActionAction
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, XCircle, CheckCircle, Ban } from "lucide-react";

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError, error } = useGetAdminModeration();
  const createAction = useCreateAdminModerationAction();

  const [notes, setNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderation</h1>
          <p className="text-muted-foreground mt-1">Take report-linked moderation actions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const handleAction = (reportId: string, action: AdminModerationActionAction) => {
    if (action === 'remove' && !window.confirm("Are you sure you want to remove this content?")) return;
    if (action === 'suspend' && !window.confirm("Are you sure you want to suspend this user?")) return;
    if (action === 'dismiss' && !window.confirm("Are you sure you want to dismiss this report?")) return;
    
    createAction.mutate(
      { data: { reportId, action, note: notes[reportId] } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getGetAdminModerationQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminReportsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminContentQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminAnalyticsQueryKey() });
          
          if (result.success) {
            toast({ title: "Action applied", description: result.message });
          } else {
            toast({ title: "Action failed", description: result.message, variant: "destructive" });
          }
          setNotes(prev => {
            const next = {...prev};
            delete next[reportId];
            return next;
          });
        },
        onError: () => toast({ title: "Error", description: "Failed to apply moderation action.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Moderation</h1>
          <p className="text-muted-foreground mt-1 text-sm">Take report-linked moderation actions.</p>
        </div>
        <Badge variant="destructive" className="font-mono rounded-sm text-sm py-1 px-3">
          {data.openCount} REQUIRED ACTIONS
        </Badge>
      </div>

      {data.items.length === 0 ? (
        <Card className="rounded-sm border-border shadow-none py-12 flex flex-col items-center justify-center text-center">
          <Shield className="w-12 h-12 text-muted/50 mb-4" />
          <CardTitle className="font-mono uppercase text-muted-foreground">MODERATION_QUEUE_EMPTY</CardTitle>
          <CardDescription className="mt-2">No pending reports require moderation action.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.items.map((report) => (
            <Card key={report.id} className="rounded-sm border-destructive/20 shadow-none overflow-hidden flex flex-col" data-testid={`card-mod-${report.id}`}>
              <div className="bg-destructive/10 px-6 py-3 border-b border-destructive/10 flex justify-between items-center">
                <div className="flex items-center gap-2 text-destructive font-mono text-sm font-bold uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  {report.reason}
                </div>
                <div className="text-xs font-mono text-muted-foreground">ID: {report.id.substring(0,8)}</div>
              </div>
              
              <CardContent className="p-6 flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground uppercase">Target ({report.targetType})</div>
                  <div className="font-mono text-sm bg-muted p-2 rounded-sm truncate">{report.targetId}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground uppercase">Reporter</div>
                  <div className="font-bold text-sm">@{report.reporter.username}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground uppercase">Report Description</div>
                  <div className="text-sm p-3 bg-card border rounded-sm">
                    {report.description || <span className="text-muted-foreground italic">No additional context provided.</span>}
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Moderator Note (Optional)</div>
                  <Textarea 
                    placeholder="Internal note about this action..." 
                    className="min-h-[60px] font-mono text-xs rounded-sm resize-none"
                    value={notes[report.id] || ''}
                    onChange={(e) => setNotes({...notes, [report.id]: e.target.value})}
                    disabled={createAction.isPending}
                    data-testid={`input-note-${report.id}`}
                  />
                </div>
              </CardContent>

              <CardFooter className="bg-muted/30 border-t p-4 flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={createAction.isPending}
                  className="rounded-sm flex-1 font-mono text-xs"
                  onClick={() => handleAction(report.id, 'dismiss')}
                  data-testid={`action-dismiss-${report.id}`}
                >
                  <XCircle className="w-3 h-3 mr-2" /> DISMISS
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={createAction.isPending}
                  className="rounded-sm flex-1 font-mono text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                  onClick={() => handleAction(report.id, 'approve')}
                  data-testid={`action-approve-${report.id}`}
                >
                  <CheckCircle className="w-3 h-3 mr-2" /> APPROVE
                </Button>
                {report.targetType === 'blast' && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    disabled={createAction.isPending}
                    className="rounded-sm flex-1 font-mono text-xs"
                    onClick={() => handleAction(report.id, 'remove')}
                    data-testid={`action-remove-${report.id}`}
                  >
                    <Ban className="w-3 h-3 mr-2" /> REMOVE CONTENT
                  </Button>
                )}
                {report.targetType === 'user' && (
                  <Button 
                    size="sm" 
                    disabled={createAction.isPending}
                    className="rounded-sm flex-1 font-mono text-xs bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    onClick={() => handleAction(report.id, 'suspend')}
                    data-testid={`action-suspend-${report.id}`}
                  >
                    <Shield className="w-3 h-3 mr-2" /> SUSPEND USER
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}