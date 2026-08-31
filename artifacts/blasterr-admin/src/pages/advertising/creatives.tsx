import { useState } from "react";
import { 
  useListAdminCreatives, 
  useCreateAdminCreative,
  useUpdateAdminCreative,
  useDeleteAdminCreative,
  getListAdminCreativesQueryKey
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
import { Search, Loader2, Plus, ExternalLink, Archive, Play, Pause, Trash2, Pencil } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";

const createCreativeSchema = z.object({
  advertiserId: z.string().min(1, "Advertiser ID is required"),
  name: z.string().min(1, "Name is required").max(160),
  type: z.enum(['image', 'video', 'text']),
  headline: z.string().min(1, "Headline is required").max(200),
  body: z.string().max(1000).optional(),
  mediaUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  destinationUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

export default function CreativesPage() {
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

  const { data, isLoading } = useListAdminCreatives(queryParams as any, {
    query: {
      queryKey: getListAdminCreativesQueryKey(queryParams as any)
    }
  });

  const createMutation = useCreateAdminCreative();
  const updateMutation = useUpdateAdminCreative();
  const deleteMutation = useDeleteAdminCreative();

  const createForm = useReactHookForm<z.infer<typeof createCreativeSchema>>({
    resolver: zodResolver(createCreativeSchema),
    defaultValues: { 
      advertiserId: "", 
      name: "", 
      type: "image",
      headline: "",
      body: "",
      mediaUrl: "",
      destinationUrl: ""
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createCreativeSchema>) => {
    createMutation.mutate({ data: {
      advertiserId: values.advertiserId,
      name: values.name,
      type: values.type,
      headline: values.headline,
      body: values.body || undefined,
      mediaUrl: values.mediaUrl || undefined,
      destinationUrl: values.destinationUrl || undefined,
    }}, {
      onSuccess: () => {
        toast({ title: "Creative Created", description: "Reusable creative asset has been created." });
        queryClient.invalidateQueries({ queryKey: getListAdminCreativesQueryKey(queryParams as any) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const updateStatus = (id: string, newStatus: 'active' | 'paused' | 'archived') => {
    updateMutation.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminCreativesQueryKey(queryParams as any) });
        toast({ title: "Status Updated", description: `Creative is now ${newStatus}.` });
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
          <h1 className="text-3xl font-bold tracking-tight">Ad Creatives</h1>
          <p className="text-muted-foreground">Manage reusable advertiser creative assets.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Creative Asset</DialogTitle>
              <DialogDescription>Define a reusable creative that can be assigned to multiple advertisements.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Summer Sale Banner" {...field} />
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creative Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="text">Text Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headline</FormLabel>
                      <FormControl>
                        <Input placeholder="Catchy title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Copy (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Detailed description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="mediaUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Media URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="destinationUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Asset
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
                placeholder="Search creatives..."
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
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Headline</TableHead>
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
                    No creative assets found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((creative) => (
                  <TableRow key={creative.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {creative.name}
                        {creative.destinationUrl && (
                          <a href={creative.destinationUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{creative.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">{creative.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        creative.status === 'active' ? 'default' : 
                        creative.status === 'archived' ? 'destructive' : 'secondary'
                      } className={creative.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {creative.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {creative.advertiserId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={creative.headline}>
                      {creative.headline}
                    </TableCell>
                    <TableCell className="text-right">
                      {creative.status !== 'archived' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" aria-label={`Edit ${creative.name}`} onClick={() => {
                            const name = prompt("Asset name", creative.name); if (name === null) return;
                            const headline = prompt("Headline", creative.headline); if (headline === null) return;
                            const body = prompt("Body copy", creative.body); if (body === null) return;
                            const mediaUrl = prompt("Media URL (blank for none)", creative.mediaUrl ?? ""); if (mediaUrl === null) return;
                            const destinationUrl = prompt("Destination URL (blank for none)", creative.destinationUrl ?? ""); if (destinationUrl === null) return;
                            updateMutation.mutate({ id: creative.id, data: { name, headline, body, mediaUrl: mediaUrl || undefined, destinationUrl: destinationUrl || undefined } }, {
                              onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminCreativesQueryKey(queryParams as any) }); toast({ title: "Creative Updated" }); },
                              onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
                            });
                          }} disabled={updateMutation.isPending}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(creative.id, creative.status === "active" ? "paused" : "active")}
                            disabled={updateMutation.isPending}
                          >
                            {creative.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to archive this creative? This cannot be undone.")) {
                                updateStatus(creative.id, "archived");
                              }
                            }}
                            disabled={updateMutation.isPending}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {creative.status === 'archived' && (
                        <Button size="icon" variant="ghost" disabled={deleteMutation.isPending} aria-label={`Delete ${creative.name}`} onClick={() => {
                          if (!confirm("Permanently delete this archived, unlinked creative?")) return;
                          deleteMutation.mutate({ id: creative.id }, {
                            onSuccess: () => {
                              queryClient.invalidateQueries({ queryKey: getListAdminCreativesQueryKey(queryParams as any) });
                              toast({ title: "Creative Deleted" });
                            },
                            onError: (err: any) => toast({ title: "Delete Failed", description: err.message || "The creative may still be linked to an ad.", variant: "destructive" }),
                          });
                        }}><Trash2 className="h-4 w-4" /></Button>
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
    </div>
  );
}
