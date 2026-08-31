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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Target } from "lucide-react";

export default function TargetingPage() {
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
    geographies: "",
    languages: "",
    devices: "",
    interests: "",
    categories: "",
    keywords: "",
    exclusions: ""
  });

  const openEditor = (campaign: any) => {
    const t = campaign.targeting || {};
    setFormState({
      geographies: t.geographies?.join(", ") || "",
      languages: t.languages?.join(", ") || "",
      devices: t.devices?.join(", ") || "",
      interests: t.interests?.join(", ") || "",
      categories: t.categories?.join(", ") || "",
      keywords: t.keywords?.join(", ") || "",
      exclusions: t.exclusions?.join(", ") || ""
    });
    setEditingCampaign(campaign);
  };

  const handleSave = () => {
    if (!editingCampaign) return;
    
    const toArray = (str: string) => str.split(",").map(s => s.trim()).filter(Boolean);
    
    updateMutation.mutate({
      id: editingCampaign.id,
      data: {
        targeting: {
          ...editingCampaign.targeting,
          geographies: toArray(formState.geographies),
          languages: toArray(formState.languages),
          devices: toArray(formState.devices) as ("mobile" | "tablet" | "desktop")[],
          interests: toArray(formState.interests),
          categories: toArray(formState.categories),
          keywords: toArray(formState.keywords),
          exclusions: toArray(formState.exclusions),
        }
      }
    }, {
      onSuccess: () => {
        toast({ title: "Targeting Updated", description: "Campaign audience targeting has been updated." });
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
          <h1 className="text-3xl font-bold tracking-tight">Audience Targeting</h1>
          <p className="text-muted-foreground">Manage campaign geographies, languages, interests, and keywords.</p>
        </div>
      </div>

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
                <TableHead>Status</TableHead>
                <TableHead>Geographies</TableHead>
                <TableHead>Interests</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !data?.items || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((campaign) => {
                  const t = campaign.targeting || {};
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                        <div className="text-xs text-muted-foreground font-mono mt-1">{campaign.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.geographies?.length ? `${t.geographies.length} regions` : "Global"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.interests?.length ? `${t.interests.length} topics` : "All"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.keywords?.length ? `${t.keywords.length} keywords` : "None"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEditor(campaign)}>
                          <Target className="w-4 h-4 mr-2" />
                          Edit Targeting
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Targeting: {editingCampaign?.name}</DialogTitle>
            <DialogDescription>Use comma-separated values for targeting fields.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Geographies (e.g., US, CA, UK)</label>
              <Input 
                value={formState.geographies}
                onChange={(e) => setFormState(s => ({ ...s, geographies: e.target.value }))}
                placeholder="Comma separated..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Devices (mobile, tablet, desktop)</label>
              <Input
                value={formState.devices}
                onChange={(e) => setFormState(s => ({ ...s, devices: e.target.value }))}
                placeholder="mobile, tablet, desktop"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Languages (e.g., en, es, fr)</label>
              <Input 
                value={formState.languages}
                onChange={(e) => setFormState(s => ({ ...s, languages: e.target.value }))}
                placeholder="Comma separated..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Interests</label>
                <Input 
                  value={formState.interests}
                  onChange={(e) => setFormState(s => ({ ...s, interests: e.target.value }))}
                  placeholder="technology, sports..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categories</label>
                <Input 
                  value={formState.categories}
                  onChange={(e) => setFormState(s => ({ ...s, categories: e.target.value }))}
                  placeholder="software, fitness..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Keywords</label>
              <Input 
                value={formState.keywords}
                onChange={(e) => setFormState(s => ({ ...s, keywords: e.target.value }))}
                placeholder="Comma separated keywords..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Exclusions (Negative Keywords/Regions)</label>
              <Input 
                value={formState.exclusions}
                onChange={(e) => setFormState(s => ({ ...s, exclusions: e.target.value }))}
                placeholder="Comma separated exclusions..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Targeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
