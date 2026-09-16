import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminBusinessClaimsQueryKey,
  useListAdminBusinessClaims,
  useReviewAdminBusinessClaim,
  type BusinessClaim,
  type BusinessClaimReview,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle2, XCircle, Info, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const messageFor = (error: unknown) => error instanceof Error ? error.message : "The request could not be completed. Please try again.";

function ReviewDialog({ claim, open, onOpenChange }: { claim: BusinessClaim | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"approved" | "rejected" | "more_info">("approved");
  const [reviewNote, setReviewNote] = useState("");
  
  const review = useReviewAdminBusinessClaim();
  const pending = review.isPending;

  // Reset form when dialog opens
  if (open && claim && !reviewNote && status === "approved" && claim.status !== "pending") {
    // Just a basic init, but we rely on the component mount mostly
  }
  
  const submit = () => {
    if (!claim) return;
    
    if (status !== "approved" && !reviewNote.trim()) {
      toast({ title: "Note required", description: "Please provide a reason or note for rejection or more info requests.", variant: "destructive" });
      return;
    }
    
    const data: BusinessClaimReview = { status, reviewNote: reviewNote.trim() || undefined };
    
    review.mutate({ claimId: claim.id, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminBusinessClaimsQueryKey() });
        toast({ title: `Claim ${status.replace("_", " ")}` });
        onOpenChange(false);
        setReviewNote("");
      },
      onError: (error) => toast({ title: "Review failed", description: messageFor(error), variant: "destructive" })
    });
  };

  return <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) setReviewNote(""); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader>
      <DialogTitle>Review Claim Request</DialogTitle>
      <DialogDescription>Process business ownership claims securely. This action is audited.</DialogDescription>
    </DialogHeader>
    
    {claim && <div className="space-y-6">
      <div className="rounded-sm border bg-muted/30 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Target ID</div>
            <div className="font-mono text-sm bg-background border px-2 py-1 rounded-sm">{claim.targetId}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Applicant ID</div>
            <div className="font-mono text-sm bg-background border px-2 py-1 rounded-sm">{claim.applicantId}</div>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Method</div>
          <Badge variant="outline" className="uppercase text-[10px]">{claim.verificationMethod.replace(/_/g, " ")}</Badge>
        </div>
        
        <div>
          <div className="text-xs text-muted-foreground uppercase font-mono mb-1">Evidence Provided</div>
          <div className="text-sm bg-background border p-3 rounded-sm whitespace-pre-wrap min-h-[60px]">
            {claim.evidence ? claim.evidence : <span className="text-muted-foreground italic">No text evidence provided</span>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="space-y-1 text-sm font-medium block">
          Decision
          <Select value={status} onValueChange={(val: any) => setStatus(val)}>
            <SelectTrigger data-testid="select-review-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approve Claim</SelectItem>
              <SelectItem value="more_info">Request More Info</SelectItem>
              <SelectItem value="rejected">Reject Claim</SelectItem>
            </SelectContent>
          </Select>
        </label>
        
        <label className="space-y-1 text-sm font-medium block">
          Review Note / Information Request
          <Textarea 
            value={reviewNote} 
            onChange={(e) => setReviewNote(e.target.value)} 
            placeholder={status === "approved" ? "Optional note..." : "Required: Explain the decision or what information is needed..."} 
            className="min-h-[100px]"
            data-testid="input-review-note"
          />
        </label>
      </div>
    </div>}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-review">Cancel</Button>
      <Button onClick={submit} disabled={pending} variant={status === "rejected" ? "destructive" : "default"} data-testid="button-submit-review">
        {pending ? "Submitting…" : status === "approved" ? "Approve Claim" : status === "rejected" ? "Reject Claim" : "Request Info"}
      </Button>
    </DialogFooter>
  </DialogContent></Dialog>;
}

export default function BusinessClaimsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  
  const params = { page, limit: 20, status: statusFilter === "all" ? undefined : statusFilter };
  const { data, isLoading, isError, error } = useListAdminBusinessClaims(params);
  
  const [selectedClaim, setSelectedClaim] = useState<BusinessClaim | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-primary">Identity Operations</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Claim Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and audit business ownership claims.</p>
      </div>
    </div>
    
    <Card className="rounded-sm">
      <CardHeader className="gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono text-sm uppercase tracking-wider">Queue {data ? `(${data.total})` : ""}</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-claims">
              <div className="flex items-center gap-2 text-xs font-mono uppercase">
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="more_info">More Info</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? <div className="p-6"><Skeleton className="h-64 w-full" /></div> : isError ? <AdminErrorState error={error} /> : 
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase w-[180px]">Date</TableHead>
              <TableHead className="font-mono text-xs uppercase">Target / Applicant</TableHead>
              <TableHead className="font-mono text-xs uppercase">Method</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.items.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center font-mono text-sm text-muted-foreground">NO_CLAIMS_FOUND</TableCell></TableRow> : 
            data?.items.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {format(new Date(claim.createdAt), "MMM d, yyyy")}
                  <div className="mt-0.5 opacity-60">{format(new Date(claim.createdAt), "HH:mm")}</div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase text-muted-foreground w-6">TGT</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-sm">{claim.targetId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase text-muted-foreground w-6">USR</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-sm">{claim.applicantId}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-medium uppercase tracking-wider">{claim.verificationMethod.replace(/_/g, " ")}</div>
                  {claim.evidence && <div className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-1" title={claim.evidence}>Has evidence attached</div>}
                </TableCell>
                <TableCell>
                  {claim.status === "pending" && <Badge variant="secondary" className="text-[9px] uppercase"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                  {claim.status === "approved" && <Badge variant="outline" className="text-[9px] uppercase text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>}
                  {claim.status === "rejected" && <Badge variant="destructive" className="text-[9px] uppercase"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                  {claim.status === "more_info" && <Badge variant="outline" className="text-[9px] uppercase text-amber-500 border-amber-500/30"><Info className="h-3 w-3 mr-1" />More Info</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setSelectedClaim(claim); setReviewOpen(true); }}
                    className="font-mono text-xs uppercase"
                    data-testid={`button-review-${claim.id}`}
                  >
                    {claim.status === "pending" || claim.status === "more_info" ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>}
      </CardContent>
      
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between border-t p-4">
          <p className="font-mono text-xs text-muted-foreground">Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="font-mono text-xs uppercase">Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.hasMore} className="font-mono text-xs uppercase">Next</Button>
          </div>
        </div>
      )}
    </Card>
    
    <ReviewDialog claim={selectedClaim} open={reviewOpen} onOpenChange={setReviewOpen} />
  </div>;
}
