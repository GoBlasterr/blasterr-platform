import { useGetAdminAuditLog } from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AuditLogPage() {
  const { data, isLoading, isError, error } = useGetAdminAuditLog();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Inspect admin action history.</p>
        </div>
        <Card className="rounded-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Audit Log</h1>
          <p className="text-muted-foreground mt-1 text-sm">Inspect admin action history.</p>
        </div>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Security Events ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-mono text-xs w-[180px]">TIMESTAMP</TableHead>
                <TableHead className="font-mono text-xs">ACTOR ID</TableHead>
                <TableHead className="font-mono text-xs">ACTION</TableHead>
                <TableHead className="font-mono text-xs">ENTITY</TableHead>
                <TableHead className="font-mono text-xs w-[300px]">DETAILS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    NO_EVENTS_FOUND
                  </TableCell>
                </TableRow>
              ) : (
                data.events.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">{event.actorId.substring(0,8)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] rounded-sm uppercase">
                        {event.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono bg-muted px-2 py-1 rounded-sm inline-block uppercase">
                        {event.entityType}:{event.entityId.substring(0,8)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono truncate max-w-[300px]" title={event.details}>
                      {event.details}
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