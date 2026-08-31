import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AdvertisingFraudReviewStatus,
  getListAdminAdvertisingAuditQueryKey,
  getListAdminAdvertisingFraudQueryKey,
  getListAdminAdvertisingNotificationsQueryKey,
  useListAdminAdvertisingFraud,
  useReviewAdminAdvertisingFraud,
  type AdvertisingFraudFlag,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Eye, ShieldAlert, XCircle } from "lucide-react";

const statuses = ["all", "open", "in_review", "resolved", "dismissed"] as const;
const severities = ["all", "critical", "high", "medium", "low"] as const;

function severityBadge(severity: string) {
  if (severity === "critical") return <Badge variant="destructive">CRITICAL</Badge>;
  if (severity === "high") return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/20">HIGH</Badge>;
  return <Badge variant="outline">{severity.toUpperCase()}</Badge>;
}

function statusBadge(status: string) {
  if (status === "open") return <Badge variant="destructive">OPEN</Badge>;
  if (status === "in_review") return <Badge className="bg-primary/15 text-primary">IN REVIEW</Badge>;
  if (status === "resolved") return <Badge className="bg-emerald-500/15 text-emerald-600">RESOLVED</Badge>;
  return <Badge variant="outline">DISMISSED</Badge>;
}

export default function AdvertisingFraudPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [severity, setSeverity] = useState<(typeof severities)[number]>("all");
  const [selected, setSelected] = useState<AdvertisingFraudFlag | null>(null);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = { page, limit: 20, status, severity };
  const query = useListAdminAdvertisingFraud(params);
  const review = useReviewAdminAdvertisingFraud();

  const criticalCount = useMemo(
    () => query.data?.items.filter((item) => item.severity === "critical" && ["open", "in_review"].includes(item.status)).length ?? 0,
    [query.data],
  );

  const updateReview = (nextStatus: keyof typeof AdvertisingFraudReviewStatus) => {
    if (!selected) return;
    review.mutate(
      { id: selected.id, data: { status: AdvertisingFraudReviewStatus[nextStatus], note: note.trim() || undefined } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListAdminAdvertisingFraudQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getListAdminAdvertisingAuditQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getListAdminAdvertisingNotificationsQueryKey() });
          toast({ title: "Review updated", description: "The decision and reviewer history were saved." });
          setSelected(null);
          setNote("");
        },
        onError: () => toast({ title: "Review failed", description: "The fraud review could not be saved.", variant: "destructive" }),
      },
    );
  };

  if (query.isError) return <AdminErrorState error={query.error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Advertising integrity</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Fraud & Abuse</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review quarantined events without deleting the raw delivery evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }} className="h-9 rounded-sm border bg-background px-3 text-sm">
            {statuses.map((item) => <option key={item} value={item}>{item.replace("_", " ").toUpperCase()}</option>)}
          </select>
          <select value={severity} onChange={(event) => { setSeverity(event.target.value as typeof severity); setPage(1); }} className="h-9 rounded-sm border bg-background px-3 text-sm">
            {severities.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open reviews</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{query.data?.openCount ?? 0}</CardContent></Card>
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Critical on page</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-3xl font-bold text-destructive"><AlertTriangle className="h-6 w-6" />{criticalCount}</CardContent></Card>
        <Card className="rounded-sm"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Quarantine policy</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-5 w-5 text-primary" />Excluded from trusted totals</CardContent></Card>
      </div>

      <Card className="rounded-sm">
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-6"><Skeleton className="h-56 w-full" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Signal</TableHead><TableHead>Advertiser / campaign</TableHead><TableHead>Event</TableHead><TableHead>Status</TableHead><TableHead>Detected</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader>
              <TableBody>
                {!query.data?.items.length ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No suspicious events match these filters.</TableCell></TableRow> :
                  query.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><div className="flex items-center gap-2">{severityBadge(item.severity)}<span className="font-medium">{item.reason.split(",").map((part) => part.replaceAll("_", " ")).join(", ")}</span></div></TableCell>
                      <TableCell><div className="font-medium">{item.advertiserName}</div><div className="font-mono text-xs text-muted-foreground">{item.campaignId.slice(0, 12)}</div></TableCell>
                      <TableCell><div className="font-mono text-xs uppercase">{item.eventType ?? "unknown"}</div><div className="max-w-48 truncate text-xs text-muted-foreground">{item.destinationUrl ?? "No destination"}</div></TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-sm">{new Date(item.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setSelected(item); setNote(item.reviewNote ?? ""); }}><Eye className="mr-2 h-4 w-4" />Review</Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
          {query.data && query.data.total > query.data.limit && (
            <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
              <span>{query.data.total} persistent flags</span>
              <div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={!query.data.hasMore} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Review suspicious event</DialogTitle><DialogDescription>Raw evidence stays stored regardless of the review decision.</DialogDescription></DialogHeader>
          {selected && <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            <div className="grid gap-3 rounded-sm border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">Event ID</span><div className="break-all font-mono text-xs">{selected.eventId ?? "Unavailable"}</div></div>
              <div><span className="text-muted-foreground">Source fingerprint</span><div className="break-all font-mono text-xs">{selected.sourceHash?.slice(0, 24) ?? "Unavailable"}</div></div>
              <div><span className="text-muted-foreground">Session</span><div className="break-all font-mono text-xs">{selected.sessionId ?? "Unavailable"}</div></div>
              <div><span className="text-muted-foreground">Reviewer</span><div className="font-mono text-xs">{selected.reviewerClerkId ?? "Unassigned"}</div></div>
            </div>
            <div><h3 className="mb-2 text-sm font-semibold">Detection evidence</h3><pre className="overflow-x-auto rounded-sm bg-black p-3 text-xs text-white">{JSON.stringify(selected.details, null, 2)}</pre></div>
            <div><h3 className="mb-2 text-sm font-semibold">Audit history</h3><div className="space-y-2">{selected.auditHistory.map((entry) => <div key={entry.id} className="rounded-sm border p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-medium">{entry.action.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span></div><p className="mt-1 text-muted-foreground">{entry.note ?? "No note"}</p><p className="mt-1 font-mono text-[10px]">{entry.actorClerkId}</p></div>)}</div></div>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer note (required to resolve or dismiss)" />
          </div>}
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => updateReview("in_review")} disabled={review.isPending}><Eye className="mr-2 h-4 w-4" />In review</Button>
            <Button variant="outline" onClick={() => updateReview("dismissed")} disabled={review.isPending || !note.trim()}><XCircle className="mr-2 h-4 w-4" />Dismiss</Button>
            <Button onClick={() => updateReview("resolved")} disabled={review.isPending || !note.trim()}><CheckCircle2 className="mr-2 h-4 w-4" />Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}