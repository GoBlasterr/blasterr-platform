import { useState } from "react";
import { 
  useListAdminCampaigns, 
  useUpdateAdminCampaign,
  getListAdminCampaignsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, DollarSign } from "lucide-react";

export default function BudgetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    ...(search ? { search } : {})
  };

  const { data, isLoading } = useListAdminCampaigns(queryParams as any, {
    query: {
      queryKey: getListAdminCampaignsQueryKey(queryParams as any)
    }
  });

  const updateMutation = useUpdateAdminCampaign();

  const [formState, setFormState] = useState({
    dailyBudget: "",
    totalBudget: "",
    pricingModel: "cpm",
    bidAmount: ""
  });

  const openEditor = (campaign: any) => {
    setFormState({
      dailyBudget: campaign.dailyBudget?.toString() || "",
      totalBudget: campaign.totalBudget?.toString() || "",
      pricingModel: campaign.pricingModel || "cpm",
      bidAmount: campaign.bidAmount?.toString() || ""
    });
    setEditingCampaign(campaign);
  };

  const handleSave = () => {
    if (!editingCampaign) return;
    
    updateMutation.mutate({
      id: editingCampaign.id,
      data: {
        dailyBudget: formState.dailyBudget ? parseFloat(formState.dailyBudget) : null,
        totalBudget: formState.totalBudget ? parseFloat(formState.totalBudget) : null,
        pricingModel: formState.pricingModel as any,
        bidAmount: formState.bidAmount ? parseFloat(formState.bidAmount) : null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Budgets Updated", description: "Campaign budget and bidding have been updated." });
        queryClient.invalidateQueries({ queryKey: getListAdminCampaignsQueryKey(queryParams as any) });
        setEditingCampaign(null);
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget Controls</h1>
          <p className="text-muted-foreground">Manage campaign budgets, bidding, and pricing models.</p>
        </div>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p>
            <strong>Note on Spend Accounting:</strong> Budgets and bids are represented in standard currency units (e.g., USD dollars). The <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">spentAmount</code> field reflects the total monetary amount consumed by the campaign to date across all its advertisements.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Pricing Model</TableHead>
                <TableHead>Bid Amount</TableHead>
                <TableHead>Daily Budget</TableHead>
                <TableHead>Total Budget</TableHead>
                <TableHead>Spent Amount</TableHead>
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
              ) : !data?.items || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                      <div className="text-xs text-muted-foreground font-mono mt-1">{campaign.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">{campaign.pricingModel}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {campaign.bidAmount !== null ? `$${campaign.bidAmount}` : 'Auto'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {campaign.dailyBudget !== null ? `$${campaign.dailyBudget}` : 'No limit'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {campaign.totalBudget !== null ? `$${campaign.totalBudget}` : 'No limit'}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold">
                      ${campaign.spentAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEditor(campaign)}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Edit Budgets
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

      <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget: {editingCampaign?.name}</DialogTitle>
            <DialogDescription>Update the spending limits and bid model for this campaign.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pricing Model</label>
                <Select 
                  value={formState.pricingModel} 
                  onValueChange={(v) => setFormState(s => ({ ...s, pricingModel: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpm">CPM (Cost per Mille)</SelectItem>
                    <SelectItem value="cpc">CPC (Cost per Click)</SelectItem>
                    <SelectItem value="cpv">CPV (Cost per View)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bid Amount (USD)</label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0.0001"
                  value={formState.bidAmount}
                  onChange={(e) => setFormState(s => ({ ...s, bidAmount: e.target.value }))}
                  placeholder="e.g. 0.50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Budget (USD)</label>
                <Input 
                  type="number"
                  step="1"
                  min="0"
                  value={formState.dailyBudget}
                  onChange={(e) => setFormState(s => ({ ...s, dailyBudget: e.target.value }))}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Budget (USD)</label>
                <Input 
                  type="number"
                  step="1"
                  min="0"
                  value={formState.totalBudget}
                  onChange={(e) => setFormState(s => ({ ...s, totalBudget: e.target.value }))}
                  placeholder="No limit"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Budgets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
