import { useState } from "react";
import { 
  useListAdminPromotions, 
  useCreateAdminPromotion,
  useReviewAdminPromotion,
  getListAdminPromotionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Loader2, Plus, CheckCircle, XCircle, Play, Pause } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";

const promotionTypes = {
  sponsored_content: "Sponsored Content",
  sponsored_trend: "Sponsored Trend",
  sponsored_hashtag: "Sponsored Hashtag",
  featured_promotion: "Featured Promotion",
};

const createPromotionSchema = z.object({
  advertiserId: z.string().min(1, "Advertiser ID is required"),
  campaignId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(160),
  description: z.string().max(1000).optional(),
  eligibilityScore: z.coerce.number().min(0).max(100).default(50),
  budget: z.coerce.number().min(0).optional(),
});

interface PromotionsPageProps {
  defaultType: keyof typeof promotionTypes;
}

export default function PromotionsPage({ defaultType }: PromotionsPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const [reviewAction, setReviewAction] = useState<{ id: string; action: "approve" | "reject" | "pause" | "resume" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    type: defaultType,
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useListAdminPromotions(queryParams as any, {
    query: {
      queryKey: getListAdminPromotionsQueryKey(queryParams as any)
    }
  });

  const createMutation = useCreateAdminPromotion();
  const reviewMutation = useReviewAdminPromotion();

  const createForm = useReactHookForm<z.infer<typeof createPromotionSchema>>({
    resolver: zodResolver(createPromotionSchema),
    defaultValues: { 
      advertiserId: "", 
      campaignId: "",
      name: "", 
      description: "",
      eligibilityScore: 50,
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createPromotionSchema>) => {
    createMutation.mutate({ data: {
      type: defaultType as any,
      advertiserId: values.advertiserId,
      campaignId: values.campaignId || undefined,
      name: values.name,
      description: values.description || undefined,
      budget: values.budget || undefined,
      eligibility: { score: values.eligibilityScore, explicit_criteria: true }
    }}, {
      onSuccess: () => {
        toast({ title: "Promotion Created", description: "Promotion has been created and is pending review." });
        queryClient.invalidateQueries({ queryKey: getListAdminPromotionsQueryKey(queryParams as any) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const title = promotionTypes[defaultType];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title} Operations</h1>
          <p className="text-muted-foreground">Manage and review {title.toLowerCase()} submissions.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Submission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit {title}</DialogTitle>
              <DialogDescription>Submit a new promotion item with explicit eligibility criteria.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion Name / Entity</FormLabel>
                        <FormControl>
                          <Input placeholder="Hashtag or Trend..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="advertiserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advertiser ID</FormLabel>
                        <FormControl>
                          <Input placeholder="adv_..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Context for the promotion..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={createForm.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="cmp_..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Allocation</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="USD" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="eligibilityScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eligibility Score (0-100)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Promotion
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search promotions..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_approval">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Promotion</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Review Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !data?.items || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">
                      {promo.name}
                      <div className="text-xs text-muted-foreground font-mono mt-1">{promo.id}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {promo.advertiserId.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        promo.status === 'approved' ? 'default' : 
                        promo.status === 'rejected' ? 'destructive' : 
                        promo.status === 'pending_approval' ? 'secondary' : 'outline'
                      } className={promo.status === 'approved' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {promo.status.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {promo.budget ? `$${promo.budget}` : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {promo.eligibility ? "Verified" : "Pending"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(promo.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {promo.status === "pending_approval" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="default" onClick={() => setReviewAction({ id: promo.id, action: "approve" })}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setReviewAction({ id: promo.id, action: "reject" })}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {promo.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => setReviewAction({ id: promo.id, action: "pause" })}>
                          <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                        </Button>
                      )}
                      {promo.status === "paused" && (
                        <Button size="sm" variant="outline" onClick={() => setReviewAction({ id: promo.id, action: "resume" })}>
                          <Play className="w-3.5 h-3.5 mr-1" /> Resume
                        </Button>
                      )}
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
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.hasMore}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewAction} onOpenChange={(open) => {
        if (!open) {
          setReviewAction(null);
          setActionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{reviewAction?.action} Promotion</DialogTitle>
            <DialogDescription>Please provide a reason for this audit action.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <label className="text-sm font-medium">Audit reason</label>
            <Input 
              value={actionReason} 
              onChange={(event) => setActionReason(event.target.value)} 
              placeholder="Why is this action being taken?" 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>Cancel</Button>
            <Button
              disabled={!actionReason.trim() || reviewMutation.isPending}
              variant={reviewAction?.action === "reject" ? "destructive" : "default"}
              onClick={() => reviewAction && reviewMutation.mutate({
                id: reviewAction.id,
                data: { action: reviewAction.action, reason: actionReason.trim() },
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListAdminPromotionsQueryKey(queryParams as any) });
                  toast({ title: "Review Submitted", description: `Promotion has been ${reviewAction.action}d.` });
                  setReviewAction(null);
                  setActionReason("");
                },
                onError: (err: any) => toast({ title: "Review Failed", description: err.message || "An error occurred", variant: "destructive" }),
              })}
            >
              {reviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
