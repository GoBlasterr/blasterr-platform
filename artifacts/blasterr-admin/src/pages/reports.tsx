import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminReports, 
  useUpdateAdminReport,
  getGetAdminReportsQueryKey,
  getGetAdminModerationQueryKey,
  getGetAdminAuditLogQueryKey,
  getGetAdminAnalyticsQueryKey,
  AdminReportUpdateStatus
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, AlertTriangle, CheckCircle, Search, XCircle } from "lucide-react";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError, error } = useGetAdminReports();
  const updateReport = useUpdateAdminReport();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Triage community reports.</p>
        </div>
        <Card className="rounded-sm"><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const handleUpdateStatus = (id: string, status: AdminReportUpdateStatus) => {
    updateReport.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminReportsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminModerationQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminAnalyticsQueryKey() });
          toast({ title: "Report updated", description: "Report status has been updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to update report.", variant: "destructive" })
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'open': return <Badge variant="destructive" className="font-mono text-[10px] rounded-sm">OPEN</Badge>;
      case 'in_review': return <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 font-mono text-[10px] rounded-sm">IN REVIEW</Badge>;
      case 'resolved': return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-mono text-[10px] rounded-sm">RESOLVED</Badge>;
      case 'dismissed': return <Badge variant="outline" className="font-mono text-[10px] rounded-sm">DISMISSED</Badge>;
      default: return <Badge variant="secondary" className="font-mono text-[10px] rounded-sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Triage community reports.</p>
        </div>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Active Reports ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-mono text-xs">REASON</TableHead>
                <TableHead className="font-mono text-xs">TARGET</TableHead>
                <TableHead className="w-[300px] font-mono text-xs">DETAILS</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
                <TableHead className="font-mono text-xs">REPORTER</TableHead>
                <TableHead className="font-mono text-xs text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    NO_REPORTS_FOUND
                  </TableCell>
                </TableRow>
              ) : (
                data.reports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    <TableCell>
                      <div className="font-bold text-sm uppercase flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                        {report.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono bg-muted px-2 py-1 rounded-sm inline-block">
                        {report.targetType}: {report.targetId.substring(0,8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm line-clamp-2">{report.description || "No description provided"}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">@{report.reporter.username}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={updateReport.isPending} className="h-8 w-8 rounded-sm" data-testid={`button-actions-${report.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm font-mono text-xs">
                          {report.status !== 'in_review' && (
                            <DropdownMenuItem disabled={updateReport.isPending} onClick={() => handleUpdateStatus(report.id, 'in_review')}>
                              <Search className="w-4 h-4 mr-2" /> Mark In Review
                            </DropdownMenuItem>
                          )}
                          {report.status !== 'resolved' && (
                            <DropdownMenuItem disabled={updateReport.isPending} onClick={() => handleUpdateStatus(report.id, 'resolved')}>
                              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> <span className="text-emerald-500">Mark Resolved</span>
                            </DropdownMenuItem>
                          )}
                          {report.status !== 'dismissed' && (
                            <DropdownMenuItem disabled={updateReport.isPending} onClick={() => handleUpdateStatus(report.id, 'dismissed')}>
                              <XCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Mark Dismissed
                            </DropdownMenuItem>
                          )}
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