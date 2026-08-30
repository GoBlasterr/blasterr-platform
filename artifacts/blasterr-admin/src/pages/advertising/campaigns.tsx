import { useState } from "react";
import { 
  useListAdminCampaigns, 
  useCreateAdminCampaign,
  useUpdateAdminCampaignStatus,
  getListAdminCampaignsQueryKey
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
import { Search, Loader2, Plus, Play, Pause } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

const createCampaignSchema = z.object({
  advertiserId: z.string().min(1, "Advertiser ID is required"),
  name: z.string().min(1, "Name is required").max(160, "Name too long"),
  placements: z.array(z.enum(['home_feed', 'following_feed', 'search', 'trending', 'profile', 'clips'])).min(1, "Select at least one placement"),
  dailyBudget: z.coerce.number().min(0).optional(),
  totalBudget: z.coerce.number().min(0).optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
});

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaignAction, setCampaignAction] = useState<{ id: string; status: "active" | "paused" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useListAdminCampaigns(queryParams, {
    query: {
      queryKey: getListAdminCampaignsQueryKey(queryParams)
    }
  });

  const createMutation = useCreateAdminCampaign();
  const statusMutation = useUpdateAdminCampaignStatus();

  const createForm = useReactHookForm<z.infer<typeof createCampaignSchema>>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: { 
      advertiserId: "", 
      name: "", 
      placements: ["home_feed"],
      status: "draft"
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createCampaignSchema>) => {
    createMutation.mutate({ data: {
      advertiserId: values.advertiserId,
      name: values.name,
      placements: values.placements,
      dailyBudget: values.dailyBudget || undefined,
      totalBudget: values.totalBudget || undefined,
      status: values.status,
      targeting: {}
    }}, {
      onSuccess: () => {
        toast({ title: "Campaign Created", description: "The campaign has been created." });
        queryClient.invalidateQueries({ queryKey: getListAdminCampaignsQueryKey(queryParams) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const placementsList = [
    { id: "home_feed", label: "Home Feed" },
    { id: "following_feed", label: "Following Feed" },
    { id: "search", label: "Search" },
    { id: "trending", label: "Trending" },
    { id: "profile", label: "Profile" },
    { id: "clips", label: "Clips" },
  ] as const;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage advertiser campaign budgets, targeting, and schedules.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>Initialize a new campaign structure.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Holiday Promo Q4" {...field} />
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
                  
                  <FormField
                    control={createForm.control}
                    name="dailyBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Budget (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="totalBudget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Budget (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="placements"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Target Placements</FormLabel>
                        <DialogDescription>
                          Select where ads in this campaign can appear.
                        </DialogDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {placementsList.map((item) => (
                          <FormField
                            key={item.id}
                            control={createForm.control}
                            name="placements"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 p-2 border rounded-md"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Active campaigns can deliver only after each ad is approved.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Campaign
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
                placeholder="Search campaigns..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placements</TableHead>
                <TableHead>Budget (D/T)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                      <div className="text-xs text-muted-foreground font-mono mt-1">{campaign.id}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {campaign.advertiserId.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        campaign.status === 'active' ? 'default' : 
                        campaign.status === 'paused' ? 'secondary' : 'outline'
                      } className={campaign.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {campaign.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {campaign.placements.slice(0, 2).map(p => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                        ))}
                        {campaign.placements.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{campaign.placements.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {campaign.dailyBudget !== null ? `$${campaign.dailyBudget}` : '∞'} / {campaign.totalBudget !== null ? `$${campaign.totalBudget}` : '∞'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={campaign.status === "active" ? "outline" : "default"}
                        onClick={() => setCampaignAction({ id: campaign.id, status: campaign.status === "active" ? "paused" : "active" })}
                      >
                        {campaign.status === "active" ? <Pause className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5" />}
                        {campaign.status === "active" ? "Pause" : "Activate"}
                      </Button>
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

      <Dialog open={Boolean(campaignAction)} onOpenChange={(open) => {
        if (!open) {
          setCampaignAction(null);
          setActionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{campaignAction?.status === "active" ? "Activate campaign" : "Pause campaign"}</DialogTitle>
            <DialogDescription>This lifecycle change is enforced by the delivery API and recorded in the audit log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <label className="text-sm font-medium" htmlFor="campaign-action-reason">Audit reason</label>
            <Input id="campaign-action-reason" value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="Why is this campaign state changing?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignAction(null)}>Cancel</Button>
            <Button
              disabled={!actionReason.trim() || statusMutation.isPending}
              onClick={() => campaignAction && statusMutation.mutate({
                id: campaignAction.id,
                data: { status: campaignAction.status, reason: actionReason.trim() },
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListAdminCampaignsQueryKey(queryParams) });
                  toast({ title: "Campaign Updated", description: `Campaign is now ${campaignAction.status}.` });
                  setCampaignAction(null);
                  setActionReason("");
                },
                onError: (err: any) => toast({ title: "Update Failed", description: err.message || "An error occurred", variant: "destructive" }),
              })}
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
