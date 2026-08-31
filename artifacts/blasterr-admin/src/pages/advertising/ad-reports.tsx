import { useState } from "react";
import { useListAdminAdvertisingReports } from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CheckCircle2, MousePointerClick } from "lucide-react";

const metric = (metrics: Record<string, unknown>, key: string) => Number(metrics[key] ?? 0);

export default function AdvertisingReportsPage() {
  const [page, setPage] = useState(1);
  const query = useListAdminAdvertisingReports({ page, limit: 20 });

  if (query.isError) return <AdminErrorState error={query.error} />;
  const reports = query.data?.items ?? [];
  const totals = reports.reduce((sum, report) => ({
    impressions: sum.impressions + metric(report.metrics, "impressions"),
    clicks: sum.clicks + metric(report.metrics, "clicks"),
    trustedEvents: sum.trustedEvents + metric(report.metrics, "trustedEvents"),
  }), { impressions: 0, clicks: 0, trustedEvents: 0 });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Trusted aggregates</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Ad Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Persistent daily snapshots include only events that passed integrity checks.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trusted events on page</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-3xl font-bold"><CheckCircle2 className="h-6 w-6 text-emerald-500" />{totals.trustedEvents.toLocaleString()}</CardContent></Card>
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Impressions</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-3xl font-bold"><BarChart3 className="h-6 w-6 text-primary" />{totals.impressions.toLocaleString()}</CardContent></Card>
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clicks</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-3xl font-bold"><MousePointerClick className="h-6 w-6 text-primary" />{totals.clicks.toLocaleString()}</CardContent></Card>
      </div>
      <Card className="rounded-sm">
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-6"><Skeleton className="h-56 w-full" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Advertiser</TableHead><TableHead>Campaign</TableHead><TableHead className="text-right">Impressions</TableHead><TableHead className="text-right">Clicks</TableHead><TableHead className="text-right">CTR</TableHead><TableHead>Integrity</TableHead></TableRow></TableHeader>
              <TableBody>
                {!reports.length ? <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Trusted report snapshots appear after verified ad events are recorded.</TableCell></TableRow> :
                  reports.map((report) => {
                    const impressions = metric(report.metrics, "impressions");
                    const clicks = metric(report.metrics, "clicks");
                    const ctr = impressions ? (clicks / impressions) * 100 : 0;
                    return <TableRow key={report.id}>
                      <TableCell>{new Date(report.reportDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{report.advertiserName}</TableCell>
                      <TableCell><div>{report.campaignName}</div><div className="font-mono text-xs text-muted-foreground">{report.campaignId.slice(0, 12)}</div></TableCell>
                      <TableCell className="text-right font-mono">{impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{ctr.toFixed(2)}%</TableCell>
                      <TableCell><Badge className="bg-emerald-500/15 text-emerald-600">TRUSTED ONLY</Badge></TableCell>
                    </TableRow>;
                  })}
              </TableBody>
            </Table>
          )}
          {query.data && query.data.total > query.data.limit && <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground"><span>{query.data.total} report snapshots</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!query.data.hasMore} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}