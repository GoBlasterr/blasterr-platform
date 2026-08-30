import { useState } from "react";
import { 
  useListAdminAdvertisers, 
  useCreateAdminAdvertiser, 
  useUpdateAdminAdvertiserStatus,
  getListAdminAdvertisersQueryKey
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
import { Search, Loader2, Plus, Edit2, ShieldAlert } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";

const createAdvertiserSchema = z.object({
  name: z.string().min(1, "Name is required").max(160, "Name too long"),
  ownerClerkId: z.string().max(200).optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal('')),
});

const updateStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  reason: z.string().max(1000).optional()
});

export default function AdvertisersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useListAdminAdvertisers(queryParams, {
    query: {
      queryKey: getListAdminAdvertisersQueryKey(queryParams)
    }
  });

  const createMutation = useCreateAdminAdvertiser();
  const updateStatusMutation = useUpdateAdminAdvertiserStatus();

  const createForm = useReactHookForm<z.infer<typeof createAdvertiserSchema>>({
    resolver: zodResolver(createAdvertiserSchema),
    defaultValues: { name: "", ownerClerkId: "", contactEmail: "" },
  });

  const statusForm = useReactHookForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: { status: "active", reason: "" },
  });

  const onSubmitCreate = (values: z.infer<typeof createAdvertiserSchema>) => {
    createMutation.mutate({ data: {
      name: values.name,
      ownerClerkId: values.ownerClerkId || undefined,
      contactEmail: values.contactEmail || undefined
    }}, {
      onSuccess: () => {
        toast({ title: "Advertiser Created", description: "The advertiser account has been created." });
        queryClient.invalidateQueries({ queryKey: getListAdminAdvertisersQueryKey(queryParams) });
        setIsCreateOpen(false);
        createForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const onSubmitStatus = (values: z.infer<typeof updateStatusSchema>) => {
    if (!selectedAdvertiser) return;
    updateStatusMutation.mutate({
      id: selectedAdvertiser,
      data: values
    }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: "The advertiser status has been updated." });
        queryClient.invalidateQueries({ queryKey: getListAdminAdvertisersQueryKey(queryParams) });
        setSelectedAdvertiser(null);
        statusForm.reset();
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
          <h1 className="text-3xl font-bold tracking-tight">Advertisers</h1>
          <p className="text-muted-foreground">Manage advertising accounts and permissions.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Advertiser
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Advertiser Account</DialogTitle>
              <DialogDescription>Create a new entity capable of running ad campaigns.</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advertiser Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="billing@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="ownerClerkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Clerk ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="user_..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
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
                placeholder="Search advertisers..."
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
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No advertisers found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((advertiser) => (
                  <TableRow key={advertiser.id}>
                    <TableCell className="font-medium">
                      {advertiser.name}
                      <div className="text-xs text-muted-foreground font-mono mt-1">{advertiser.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        advertiser.status === 'active' ? 'default' : 
                        advertiser.status === 'suspended' ? 'destructive' : 'secondary'
                      } className={advertiser.status === 'active' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-0' : ''}>
                        {advertiser.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{advertiser.contactEmail || "No email"}</div>
                      <div className="text-xs text-muted-foreground">{advertiser.ownerClerkId || "No owner"}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(advertiser.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={selectedAdvertiser === advertiser.id} onOpenChange={(open) => {
                        if (open) {
                          setSelectedAdvertiser(advertiser.id);
                          statusForm.reset({ status: advertiser.status, reason: "" });
                        } else {
                          setSelectedAdvertiser(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Advertiser Status</DialogTitle>
                            <DialogDescription>
                              Modify operational status for {advertiser.name}. Suspending an advertiser immediately halts all their active campaigns.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...statusForm}>
                            <form onSubmit={statusForm.handleSubmit(onSubmitStatus)} className="space-y-4">
                              <FormField
                                control={statusForm.control}
                                name="status"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={statusForm.control}
                                name="reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Reason for Change (Audit Log)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g. Terms of Service violation" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelectedAdvertiser(null)}>Cancel</Button>
                                <Button type="submit" variant={statusForm.watch("status") === "suspended" ? "destructive" : "default"} disabled={updateStatusMutation.isPending}>
                                  {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Confirm Update
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1} to Math.min(page * data.limit, data.total) of {data.total}
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
