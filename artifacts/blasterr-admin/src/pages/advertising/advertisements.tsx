import { useState } from "react";
import { 
  useListAdminAdvertisements, 
  useCreateAdminAdvertisement,
  getListAdminAdvertisementsQueryKey
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
import { Search, Loader2, Plus, ExternalLink } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";

const createAdSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  name: z.string().min(1, "Name is required").max(160),
  placement: z.enum(['home_feed', 'following_feed', 'search', 'trending', 'profile', 'clips', 'right_rail']),
  headline: z.string().min(1, "Headline is required").max(200),
  body: z.string().max(1000).optional(),
  mediaUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  destinationUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

export default function AdvertisementsPage() {
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

  const { data, isLoading } = useListAdminAdvertisements(queryParams, {
    query: {
      queryKey: getListAdminAdvertisementsQueryKey(queryParams)
    }
  });

  const createMutation = useCreateAdminAdvertisement();

  const createForm = useReactHookForm<z.infer<typeof createAdSchema>>({
    resolver: zodResolver(createAdSchema),
    defaultValues: { 
      campaignId: "", 
      name: "", 
      placement: "home_feed",
      headline: "",
      body: "",
      mediaUrl: "",
      destinationUrl: ""
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createAdSchema>) => {
    createMutation.mutate({ data: {
      campaignId: values.campaignId,
      name: values.name,
      placement: values.placement,
      headline: values.headline,
      body: values.body || undefined,
      mediaUrl: values.mediaUrl || undefined,
      destinationUrl: values.destinationUrl || undefined
    }}, {
      onSuccess: () => {
        toast({ title: "Advertisement Created", description: "The ad creative has been queued for review." });
        queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey(queryParams) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertisements</h1>
          <p className="text-muted-foreground">Manage creative assets and delivery status.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Advertisement Creative</DialogTitle>
              <DialogDescription>New creatives require moderation review before delivery.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Banner Variant A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>

                <FormField
                  control={createForm.control}
                  name="placement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Placement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select placement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home_feed">Home Feed</SelectItem>
                          <SelectItem value="following_feed">Following Feed</SelectItem>
                          <SelectItem value="search">Search Results</SelectItem>
                          <SelectItem value="trending">Trending Page</SelectItem>
                          <SelectItem value="profile">User Profile</SelectItem>
                          <SelectItem value="clips">Clips Feed</SelectItem>
                          <SelectItem value="right_rail">Desktop Right Rail</SelectItem>
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
                        <Input placeholder="Buy our product..." {...field} />
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
                        <Input placeholder="Additional context..." {...field} />
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
                        <FormLabel>Click Destination URL (Optional)</FormLabel>
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
                    Create Creative
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
                  <SelectItem value="pending_approval">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                <TableHead>Creative Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Headline</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No advertisements found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ad.name}
                        {ad.destinationUrl && (
                          <a href={ad.destinationUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{ad.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">{ad.placement}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        ad.status === 'active' || ad.status === 'approved' ? 'default' : 
                        ad.status === 'rejected' ? 'destructive' : 
                        ad.status === 'pending_approval' ? 'secondary' : 'outline'
                      } className={ad.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {ad.status.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={ad.headline}>
                      {ad.headline}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {ad.campaignId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ad.createdAt).toLocaleDateString()}
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
