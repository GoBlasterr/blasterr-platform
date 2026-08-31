import { useState } from "react";
import { 
  useListAdminAdGroups, 
  useCreateAdminAdGroup,
  useUpdateAdminAdGroup,
  useDeleteAdminAdGroup,
  getListAdminAdGroupsQueryKey
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
import { Search, Loader2, Plus, Play, Pause, Trash2, Pencil } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";

const createAdGroupSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  name: z.string().min(1, "Name is required").max(160, "Name too long"),
  status: z.enum(['active', 'paused']).default('active'),
  frequencyCap: z.coerce.number().min(1).max(1000).optional(),
  geographies: z.string().optional(),
  languages: z.string().optional(),
  devices: z.string().optional(),
  interests: z.string().optional(),
  categories: z.string().optional(),
  keywords: z.string().optional(),
  exclusions: z.string().optional(),
});

export default function AdGroupsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useListAdminAdGroups(queryParams as any, {
    query: {
      queryKey: getListAdminAdGroupsQueryKey(queryParams as any)
    }
  });

  const createMutation = useCreateAdminAdGroup();
  const statusMutation = useUpdateAdminAdGroup();
  const deleteMutation = useDeleteAdminAdGroup();

  const createForm = useReactHookForm<z.infer<typeof createAdGroupSchema>>({
    resolver: zodResolver(createAdGroupSchema),
    defaultValues: { 
      campaignId: "", 
      name: "", 
      status: "active"
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createAdGroupSchema>) => {
    const list = (value?: string) => value?.split(",").map((item) => item.trim()).filter(Boolean);
    createMutation.mutate({ data: {
      campaignId: values.campaignId,
      name: values.name,
      status: values.status,
      frequencyCap: values.frequencyCap || undefined,
      targeting: {
        geographies: list(values.geographies),
        languages: list(values.languages),
        devices: list(values.devices) as ("mobile" | "tablet" | "desktop")[] | undefined,
        interests: list(values.interests),
        categories: list(values.categories),
        keywords: list(values.keywords),
        exclusions: list(values.exclusions),
      }
    }}, {
      onSuccess: () => {
        toast({ title: "Ad Group Created", description: "The ad group has been created." });
        queryClient.invalidateQueries({ queryKey: getListAdminAdGroupsQueryKey(queryParams as any) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    statusMutation.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminAdGroupsQueryKey(queryParams as any) });
        toast({ title: "Status Updated", description: `Ad group is now ${newStatus}.` });
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
          <h1 className="text-3xl font-bold tracking-tight">Ad Groups</h1>
          <p className="text-muted-foreground">Manage campaign subdivisions and frequency caps.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Ad Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Ad Group</DialogTitle>
              <DialogDescription>Group ads within a campaign with specific targeting and caps.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="campaignId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign ID</FormLabel>
                      <FormControl>
                        <Input placeholder="cmp_..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="US Mobile Users" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="frequencyCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency Cap</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="No limit" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["geographies", "Geographies", "US, CA"],
                    ["languages", "Languages", "en, es"],
                    ["devices", "Devices", "mobile, desktop"],
                    ["interests", "Interests", "sports, music"],
                    ["categories", "Categories", "technology, culture"],
                    ["keywords", "Keywords", "launch, festival"],
                    ["exclusions", "Exclusions", "gambling, politics"],
                  ] as const).map(([name, label, placeholder]) => (
                    <FormField key={name} control={createForm.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl><Input placeholder={placeholder} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
                
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Ad Group
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
                placeholder="Search ad groups..."
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
                  <SelectItem value="active">Active</SelectItem>
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
                <TableHead>Ad Group</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Frequency Cap</TableHead>
                <TableHead>Created</TableHead>
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
                    No ad groups found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((ag) => (
                  <TableRow key={ag.id}>
                    <TableCell className="font-medium">
                      {ag.name}
                      <div className="text-xs text-muted-foreground font-mono mt-1">{ag.id}</div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {ag.campaignId.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={ag.status === 'active' ? 'default' : 'secondary'} className={ag.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {ag.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ag.frequencyCap ? `${ag.frequencyCap} per user` : 'No limit'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ag.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${ag.name}`} disabled={statusMutation.isPending} onClick={() => {
                          const name = prompt("Ad group name", ag.name); if (name === null) return;
                          const cap = prompt("Frequency cap per session (blank for none)", ag.frequencyCap?.toString() ?? ""); if (cap === null) return;
                          const target = prompt("Targeting JSON", JSON.stringify(ag.targeting, null, 2)); if (target === null) return;
                          try {
                            statusMutation.mutate({ id: ag.id, data: { name, frequencyCap: cap ? Number(cap) : null, targeting: JSON.parse(target) } }, {
                              onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminAdGroupsQueryKey(queryParams as any) }); toast({ title: "Ad Group Updated" }); },
                              onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
                            });
                          } catch { toast({ title: "Invalid targeting JSON", variant: "destructive" }); }
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant={ag.status === "active" ? "outline" : "default"} onClick={() => toggleStatus(ag.id, ag.status)} disabled={statusMutation.isPending}>
                          {ag.status === "active" ? <Pause className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5" />}
                          {ag.status === "active" ? "Pause" : "Activate"}
                        </Button>
                        <Button size="icon" variant="ghost" disabled={deleteMutation.isPending} aria-label={`Delete ${ag.name}`} onClick={() => {
                          if (!confirm("Delete this unlinked ad group? Linked groups must be paused instead.")) return;
                          deleteMutation.mutate({ id: ag.id }, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: getListAdminAdGroupsQueryKey(queryParams as any) });
                              toast({ title: "Ad Group Deleted" });
                            },
                            onError: (err: any) => toast({ title: "Delete Failed", description: err.message || "The group may still be linked to an ad.", variant: "destructive" }),
                          });
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
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
    </div>
  );
}
