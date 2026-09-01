import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminAppealsQueryKey,
  useListAdminAppeals,
  useReviewAdminAppeal,
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

type AppealStatus = "in_review" | "approved" | "rejected";

export default function AppealsPage() {
  const [status, setStatus] = useState<"all" | "open" | AppealStatus>("all");
  const [review, setReview] = useState<{ id: string; status: AppealStatus } | null>(null);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = { page: 1, limit: 100, status };
  const query = useListAdminAppeals(params);
  const mutation = useReviewAdminAppeal();

  if (query.isError) return <AdminErrorState error={query.error} />;

  const submit = () => {
    if (!review || ((review.status === "approved" || review.status === "rejected") && !note.trim())) return;
    mutation.mutate({ id: review.id, data: { status: review.status, note: note.trim() || undefined } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminAppealsQueryKey(params) });
        toast({ title: "Appeal updated" });
        setReview(null);
        setNote("");
      },
      onError: (error) => toast({ title: "Review failed", description: error.message, variant: "destructive" }),
    });
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Moderation review</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Appeals</h1><p className="mt-1 text-sm text-muted-foreground">Review durable appeals tied to moderation decisions.</p></div><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_review">In review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
    {query.isLoading ? <Skeleton className="h-52 w-full" /> : <Card className="rounded-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Reason</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>
      {!query.data?.items.length ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No appeals found.</TableCell></TableRow> : query.data.items.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.reason}</TableCell><TableCell className="font-mono text-xs">{item.targetType}: {item.targetId}</TableCell><TableCell className="max-w-xs text-sm text-muted-foreground">{item.details || "No additional details"}</TableCell><TableCell><Badge variant={item.status === "rejected" ? "destructive" : item.status === "approved" ? "default" : "outline"}>{item.status.replaceAll("_", " ").toUpperCase()}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2">{item.status === "open" && <Button size="sm" variant="outline" onClick={() => setReview({ id: item.id, status: "in_review" })}>Start review</Button>}<Button size="sm" onClick={() => setReview({ id: item.id, status: "approved" })}>Approve</Button><Button size="sm" variant="destructive" onClick={() => setReview({ id: item.id, status: "rejected" })}>Reject</Button></div></TableCell></TableRow>)}
    </TableBody></Table></CardContent></Card>}
    <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open) { setReview(null); setNote(""); } }}><DialogContent><DialogHeader><DialogTitle>Review appeal</DialogTitle><DialogDescription>Approval and rejection decisions require a reviewer note and are recorded in the audit log.</DialogDescription></DialogHeader><Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer note" /><DialogFooter><Button variant="outline" onClick={() => setReview(null)}>Cancel</Button><Button variant={review?.status === "rejected" ? "destructive" : "default"} disabled={mutation.isPending || ((review?.status === "approved" || review?.status === "rejected") && !note.trim())} onClick={submit}>Confirm</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}