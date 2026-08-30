import { useState } from "react";
import { 
  useListAdminAdvertisements, 
  useReviewAdminAdvertisement,
  getListAdminAdvertisementsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

function safeHostname(value: string | null): string {
  if (!value) return "None";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.hostname : "Invalid URL";
  } catch {
    return "Invalid URL";
  }
}

export default function ApprovalsPage() {
  const [page, setPage] = useState(1);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [reason, setReason] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 50,
    status: "pending_approval"
  };

  const { data, isLoading } = useListAdminAdvertisements(queryParams, {
    query: {
      queryKey: getListAdminAdvertisementsQueryKey(queryParams)
    }
  });

  const reviewMutation = useReviewAdminAdvertisement();

  const handleReview = (action: "approve" | "reject" | "request_changes", advertisement = selectedAd) => {
    if (!advertisement) return;

    if ((action === "reject" || action === "request_changes") && !reason.trim()) {
      toast({ title: "Reason Required", description: "You must provide a reason for rejection or requesting changes.", variant: "destructive" });
      return;
    }

    reviewMutation.mutate({
      id: advertisement.id,
      data: {
        action,
        reason: reason.trim() || undefined
      }
    }, {
      onSuccess: () => {
        toast({ title: "Review Submitted", description: `Advertisement has been marked as ${action.replace('_', ' ')}.` });
        queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey(queryParams) });
        setSelectedAd(null);
        setReason("");
      },
      onError: (err: any) => {
        toast({ title: "Review Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertisement Approvals</h1>
          <p className="text-muted-foreground">Review and moderate incoming advertising creatives.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="px-3 py-1">
            {data?.total || 0} Pending
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
            <CheckCircle className="w-12 h-12 opacity-20" />
            <p className="font-medium text-lg">Inbox Zero</p>
            <p className="text-sm">No advertisements currently require review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((ad) => (
            <Card key={ad.id} className="flex flex-col overflow-hidden">
              {ad.mediaUrl ? (
                <div className="aspect-video w-full bg-muted border-b overflow-hidden relative group">
                  <img src={ad.mediaUrl} alt={ad.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={ad.mediaUrl} target="_blank" rel="noreferrer" className="text-white flex items-center gap-2 hover:underline">
                      <ExternalLink className="w-4 h-4" /> View Source Media
                    </a>
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted border-b flex items-center justify-center text-muted-foreground">
                  No Media Attached
                </div>
              )}
              
              <CardContent className="p-4 flex-1 space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] font-mono">{ad.placement}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(ad.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold leading-tight">{ad.headline}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{ad.body || "No body copy provided."}</p>
                </div>
                
                <div className="text-xs font-mono bg-muted p-2 rounded-md space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="truncate ml-2">{ad.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dest:</span>
                    <span className="truncate ml-2 text-primary">{safeHostname(ad.destinationUrl)}</span>
                  </div>
                </div>
              </CardContent>
              
              <div className="p-4 border-t bg-muted/30 grid grid-cols-2 gap-2">
                <Dialog open={selectedAd?.id === ad.id} onOpenChange={(open) => {
                  if (open) setSelectedAd(ad);
                  else { setSelectedAd(null); setReason(""); }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject or Request Changes</DialogTitle>
                      <DialogDescription>
                        Explain why this advertisement violates guidelines or requires modification.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Reason for rejection</label>
                        <Textarea 
                          value={reason} 
                          onChange={e => setReason(e.target.value)} 
                          placeholder="e.g. Image contains restricted content..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setSelectedAd(null)}>Cancel</Button>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handleReview("request_changes")} disabled={reviewMutation.isPending || !reason.trim()}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Request Changes
                        </Button>
                        <Button variant="destructive" onClick={() => handleReview("reject")} disabled={reviewMutation.isPending || !reason.trim()}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject Permanently
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => {
                    handleReview("approve", ad);
                  }}
                  disabled={reviewMutation.isPending && selectedAd?.id === ad.id}
                >
                  {reviewMutation.isPending && selectedAd?.id === ad.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between px-4 py-3 bg-card border rounded-md">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.hasMore}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
