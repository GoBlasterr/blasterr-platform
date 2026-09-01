import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminBoostRequestsQueryKey,
  useListAdminBoostRequests,
  useReviewAdminBoostRequest,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Pause, XCircle } from "lucide-react";

type ReviewStatus = "approved" | "paused" | "rejected";

export default function BoostedContentPage() {
  const [status, setStatus] = useState<"all" | "pending_review" | "approved" | "paused" | "rejected">("all");
  const [review, setReview] = useState<{ id: string; status: ReviewStatus } | null>(null);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = { page: 1, limit: 100, status };
  const query = useListAdminBoostRequests(params);
  const mutation = useReviewAdminBoostRequest();

  if (query.isError) return <AdminErrorState error={query.error} />;

  const submitReview = () => {
    if (!review || !note.trim()) return;
    mutation.mutate({ id: review.id, data: { status: review.status, note: note.trim() } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminBoostRequestsQueryKey(params) });
        toast({ title: "Boost request updated", description: `The request is now ${review.status.replace("_", " ")}.` });
        setReview(null);
        setNote("");
      },
      onError: (error) => toast({ title: "Review failed", description: error.message, variant: "destructive" }),
    });
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Advertising review</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Boosted Content</h1><p className="mt-1 text-sm text-muted-foreground">Approve, pause, or reject Blast boost requests without changing ordinary campaigns.</p></div>
      <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="pending_review">Pending review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
    </div>
    {query.isLoading ? <Skeleton className="h-52 w-full" /> : <Card className="rounded-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Blast</TableHead><TableHead>Placement</TableHead><TableHead>Budget</TableHead><TableHead>Schedule</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>
      {!query.data?.items.length ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No boost requests found.</TableCell></TableRow> : query.data.items.map((item) => <TableRow key={item.id}>
        <TableCell><div className="font-mono text-xs">{item.blastId}</div><div className="mt-1 text-xs text-muted-foreground">{item.requestNote || "No requester note"}</div></TableCell>
        <TableCell>{item.placement.replaceAll("_", " ")}</TableCell>
        <TableCell>{item.budget === null ? "Not set" : `$${item.budget.toFixed(2)}`}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{item.startsAt ? new Date(item.startsAt).toLocaleDateString() : "Immediate"} – {item.endsAt ? new Date(item.endsAt).toLocaleDateString() : "Open"}</TableCell>
        <TableCell><Badge variant={item.status === "rejected" ? "destructive" : item.status === "approved" ? "default" : "outline"}>{item.status.replaceAll("_", " ").toUpperCase()}</Badge></TableCell>
        <TableCell className="text-right"><div className="flex justify-end gap-2">{item.status !== "approved" && <Button size="sm" onClick={() => setReview({ id: item.id, status: "approved" })}><CheckCircle className="mr-1 h-4 w-4" />Approve</Button>}{item.status === "approved" && <Button size="sm" variant="outline" onClick={() => setReview({ id: item.id, status: "paused" })}><Pause className="mr-1 h-4 w-4" />Pause</Button>}{item.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => setReview({ id: item.id, status: "rejected" })}><XCircle className="mr-1 h-4 w-4" />Reject</Button>}</div></TableCell>
      </TableRow>)}
    </TableBody></Table></CardContent></Card>}
    <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open) { setReview(null); setNote(""); } }}><DialogContent><DialogHeader><DialogTitle>Review boost request</DialogTitle><DialogDescription>This decision and note will be added to the advertising audit history.</DialogDescription></DialogHeader><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain this decision" /><DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Cancel</Button><Button variant={review?.status === "rejected" ? "destructive" : "default"} disabled={!note.trim() || mutation.isPending} onClick={submitReview}>Confirm {review?.status.replace("_", " ")}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}