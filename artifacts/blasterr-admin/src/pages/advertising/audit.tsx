import { useState } from "react";
import { 
  useListAdminAdvertisingAudit, 
  getListAdminAdvertisingAuditQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";

export default function AdvertisingAuditPage() {
  const [page, setPage] = useState(1);

  const queryParams = { page, limit: 50 };

  const { data, isLoading } = useListAdminAdvertisingAudit(queryParams, {
    query: { queryKey: getListAdminAdvertisingAuditQueryKey(queryParams) }
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advertising Audit Log</h1>
        <p className="text-muted-foreground">Append-only record of all advertising configuration and moderation changes.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">System Records</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor (Clerk ID)</TableHead>
                <TableHead className="w-[30%]">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No audit records found.</TableCell></TableRow>
              ) : (
                data?.items.map(audit => (
                  <TableRow key={audit.id}>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {new Date(audit.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono bg-muted/50">{audit.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-semibold">{audit.entityType}</span>
                      {audit.entityId && <div className="text-xs font-mono text-muted-foreground mt-0.5">{audit.entityId}</div>}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {audit.actorClerkId || 'SYSTEM'}
                    </TableCell>
                    <TableCell className="text-sm italic text-muted-foreground">
                      {audit.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.hasMore}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
