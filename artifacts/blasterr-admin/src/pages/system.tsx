import { useGetAdminSystem } from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Server, Clock, GitCommit } from "lucide-react";

export default function SystemPage() {
  const { data, isLoading, isError, error } = useGetAdminSystem();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground mt-1">Inspect protected service health.</p>
        </div>
        <Card className="rounded-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600*24));
    const hrs = Math.floor((seconds % (3600*24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">System Status</h1>
          <p className="text-muted-foreground mt-1 text-sm">Inspect protected service health.</p>
        </div>
        {data.status === 'operational' ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-mono rounded-sm px-3 py-1">ALL SYSTEMS OPERATIONAL</Badge>
        ) : (
          <Badge variant="destructive" className="font-mono rounded-sm px-3 py-1">DEGRADED PERFORMANCE</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-sm border-border shadow-none bg-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-sm">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground uppercase">API Status</p>
              <p className="text-xl font-bold font-mono tracking-tight capitalize" data-testid="sys-status">{data.status}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-border shadow-none bg-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-sm border">
              <GitCommit className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground uppercase">Version</p>
              <p className="text-xl font-bold font-mono tracking-tight" data-testid="sys-version">{data.version}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-border shadow-none bg-muted/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-sm border">
              <Clock className="w-6 h-6 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground uppercase">Uptime</p>
              <p className="text-xl font-bold font-mono tracking-tight" data-testid="sys-uptime">{formatUptime(data.uptimeSeconds)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Service Checks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.checks.map((check, idx) => (
              <div key={idx} className="flex items-center justify-between p-4" data-testid={`check-${check.name}`}>
                <div className="flex items-center gap-3">
                  {check.status === 'operational' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-bold text-sm font-mono uppercase">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.detail}</p>
                  </div>
                </div>
                <Badge variant={check.status === 'operational' ? 'outline' : 'destructive'} className="font-mono text-[10px] rounded-sm uppercase">
                  {check.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}