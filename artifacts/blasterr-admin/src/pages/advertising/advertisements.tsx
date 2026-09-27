import { useState, useMemo } from "react";
import { 
  useListAdminAdvertisements, 
  useCreateAdminAdvertisement,
  getListAdminAdvertisementsQueryKey,
  useListAdminAdvertisers,
  useListAdminCampaigns,
  useListAdminAdGroups,
  useListAdminCreatives
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
import { DeleteAdvertisementButton } from "./delete-advertisement-button";

function isHttpUrlOrStoredMediaPath(value: string): boolean {
  if (/^\/api\/storage\/objects\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.[A-Za-z0-9]+$/.test(value)) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function responseError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

async function uploadAdvertisementImage(file: File): Promise<{ assetId: string; mediaUrl: string }> {
  const requestResponse = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, purpose: "advertisement" }),
  });
  const uploadRequest = await requestResponse.json().catch(() => null);
  if (!requestResponse.ok) {
    throw new Error(typeof uploadRequest?.error === "string" ? uploadRequest.error : "Could not start the upload.");
  }
  if (typeof uploadRequest?.assetId !== "string" || typeof uploadRequest?.objectPath !== "string") {
    throw new Error("The upload service returned incomplete file details.");
  }

  const assetId = uploadRequest.assetId as string;
  try {
    const contentResponse = await fetch(`/api/storage/uploads/${encodeURIComponent(assetId)}/content`, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!contentResponse.ok) {
      throw new Error(await responseError(contentResponse, "The image could not be uploaded."));
    }

    const completeResponse = await fetch(`/api/storage/uploads/${encodeURIComponent(assetId)}/complete`, {
      method: "POST",
    });
    const completedUpload = await completeResponse.json().catch(() => null);
    if (!completeResponse.ok) {
      throw new Error(typeof completedUpload?.error === "string" ? completedUpload.error : "The uploaded image could not be verified.");
    }
    const objectPath = typeof completedUpload?.objectPath === "string" ? completedUpload.objectPath : uploadRequest.objectPath;
    return { assetId, mediaUrl: `/api/storage${objectPath}` };
  } catch (error) {
    await fetch(`/api/storage/uploads/${encodeURIComponent(assetId)}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

async function deleteUploadedAdvertisementImage(assetId: string): Promise<void> {
  const response = await fetch(`/api/storage/uploads/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await responseError(response, "The uploaded image could not be removed."));
}

const createAdSchema = z.object({
  advertiserId: z.string().min(1, "Advertiser is required"),
  campaignId: z.string().min(1, "Campaign ID is required"),
  adGroupId: z.string().optional(),
  creativeId: z.string().optional(),
  name: z.string().min(1, "Name is required").max(160),
  placement: z.enum(['home_feed', 'following_feed', 'search', 'trending', 'profile', 'clips', 'right_rail']),
  headline: z.string().optional(), // Now optional since creativeId can provide it
  body: z.string().max(1000).optional(),
  mediaUrl: z.string().refine(isHttpUrlOrStoredMediaPath, "Upload an image or enter a valid HTTP(S) URL").optional().or(z.literal('')),
  destinationUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  // Targeting
  geographies: z.string().optional(),
  languages: z.string().optional(),
  interests: z.string().optional(),
  keywords: z.string().optional(),
});

export default function AdvertisementsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState("");
  const [uploadedMediaAssetId, setUploadedMediaAssetId] = useState<string | null>(null);
  const [uploadedMediaName, setUploadedMediaName] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = { 
    page, 
    limit: 20, 
    ...(search ? { search } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data, isLoading } = useListAdminAdvertisements(queryParams as any, {
    query: {
      queryKey: getListAdminAdvertisementsQueryKey(queryParams as any)
    }
  });

  const { data: advertisersData } = useListAdminAdvertisers({ page: 1, limit: 100 } as any);
  const { data: campaignsData } = useListAdminCampaigns({ page: 1, limit: 100 } as any);
  const { data: adGroupsData } = useListAdminAdGroups({ limit: 100, status: "active" } as any);
  const { data: creativesData } = useListAdminCreatives({ limit: 100, status: "active" } as any);

  const createMutation = useCreateAdminAdvertisement();

  const createForm = useReactHookForm<z.infer<typeof createAdSchema>>({
    resolver: zodResolver(createAdSchema),
    defaultValues: { 
      advertiserId: "",
      campaignId: "", 
      adGroupId: "",
      creativeId: "",
      name: "", 
      placement: "home_feed",
      headline: "",
      body: "",
      mediaUrl: "",
      destinationUrl: "",
      geographies: "",
      languages: "",
      interests: "",
      keywords: ""
    },
  });

  const onSubmitCreate = (values: z.infer<typeof createAdSchema>) => {
    const toArray = (str?: string) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : undefined;

    // Use a placeholder if creativeId is set, as the server will pull the real headline
    const linkedCreativeId = values.creativeId && values.creativeId !== "none" ? values.creativeId : undefined;
    const finalHeadline = linkedCreativeId && !values.headline ? "Pending Creative Link" : (values.headline || "");

    if (!linkedCreativeId && !finalHeadline) {
      createForm.setError("headline", { type: "manual", message: "Headline is required if no creative is selected." });
      return;
    }

    createMutation.mutate({ data: {
      campaignId: values.campaignId,
      adGroupId: values.adGroupId && values.adGroupId !== "none" ? values.adGroupId : undefined,
      creativeId: linkedCreativeId,
      name: values.name,
      placement: values.placement as any,
      headline: finalHeadline,
      body: values.body || undefined,
      mediaUrl: values.mediaUrl || undefined,
      destinationUrl: values.destinationUrl || undefined,
      targeting: {
        geographies: toArray(values.geographies),
        languages: toArray(values.languages),
        interests: toArray(values.interests),
        keywords: toArray(values.keywords),
      }
    }}, {
      onSuccess: () => {
        toast({ title: "Advertisement Created", description: "The ad has been queued for review." });
        queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey(queryParams as any) });
        setIsCreateOpen(false);
        createForm.reset();
        setUploadedMediaAssetId(null);
        setUploadedMediaName("");
        setMediaUploadError("");
      },
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const selectedCreativeId = createForm.watch("creativeId");
  const selectedAdvertiserId = createForm.watch("advertiserId");
  const selectedCampaignId = createForm.watch("campaignId");
  const isCreativeSelected = !!selectedCreativeId && selectedCreativeId !== "none";
  const campaignsForAdvertiser = useMemo(
    () => campaignsData?.items.filter(campaign => campaign.advertiserId === selectedAdvertiserId) ?? [],
    [campaignsData, selectedAdvertiserId],
  );
  const adGroupsForCampaign = useMemo(
    () => adGroupsData?.items.filter(group => group.campaignId === selectedCampaignId) ?? [],
    [adGroupsData, selectedCampaignId],
  );
  const creativesForAdvertiser = useMemo(
    () => creativesData?.items.filter(creative => creative.advertiserId === selectedAdvertiserId) ?? [],
    [creativesData, selectedAdvertiserId],
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertisements</h1>
          <p className="text-muted-foreground">Manage individual ad placements and status.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Advertisement</DialogTitle>
              <DialogDescription>Create a new ad. Select an existing creative to inherit its content automatically.</DialogDescription>
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
                    name="advertiserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registered Advertiser</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            createForm.setValue("campaignId", "", { shouldValidate: true });
                            createForm.setValue("adGroupId", "");
                            createForm.setValue("creativeId", "");
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an advertiser" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {advertisersData?.items.map(advertiser => (
                              <SelectItem key={advertiser.id} value={advertiser.id}>
                                {advertiser.name} ({advertiser.status})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={createForm.control}
                  name="campaignId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign</FormLabel>
                      <Select
                        value={field.value}
                        disabled={!selectedAdvertiserId || campaignsForAdvertiser.length === 0}
                        onValueChange={(value) => {
                          field.onChange(value);
                          createForm.setValue("adGroupId", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campaignsForAdvertiser.map(campaign => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name} ({campaign.status})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedAdvertiserId && campaignsForAdvertiser.length === 0
                          ? "No campaigns are registered for this advertiser."
                          : "Choose an advertiser first to see its campaigns."}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="adGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ad Group (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCampaignId}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {adGroupsForCampaign.map(ag => (
                              <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>

                <div className="p-4 bg-muted/30 border border-dashed rounded-md space-y-4">
                  <FormField
                    control={createForm.control}
                    name="creativeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Creative Asset (Optional)</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (value !== "none" && uploadedMediaAssetId) {
                              const assetId = uploadedMediaAssetId;
                              createForm.setValue("mediaUrl", "", { shouldDirty: true, shouldValidate: true });
                              setUploadedMediaAssetId(null);
                              setUploadedMediaName("");
                              void deleteUploadedAdvertisementImage(assetId).catch(() => undefined);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Custom Content" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Custom Content (Fill below)</SelectItem>
                            {creativesForAdvertiser.map(cr => (
                              <SelectItem key={cr.id} value={cr.id}>{cr.name} - {cr.headline.slice(0, 20)}...</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">If selected, the server will authoritative override the fields below.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isCreativeSelected && (
                    <>
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
                              <FormLabel>Advertisement Image (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  disabled={isUploadingMedia}
                                  onChange={async (event) => {
                                    const file = event.currentTarget.files?.[0];
                                    event.currentTarget.value = "";
                                    if (!file) return;
                                    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                                    if (!allowedTypes.includes(file.type)) {
                                      setMediaUploadError("Choose a JPG, PNG, WebP, or GIF image.");
                                      return;
                                    }
                                    if (file.size > 10 * 1024 * 1024) {
                                      setMediaUploadError("Images must be 10 MB or smaller.");
                                      return;
                                    }

                                    setMediaUploadError("");
                                    setIsUploadingMedia(true);
                                    try {
                                      const upload = await uploadAdvertisementImage(file);
                                      const previousAssetId = uploadedMediaAssetId;
                                      createForm.setValue("mediaUrl", upload.mediaUrl, { shouldDirty: true, shouldValidate: true });
                                      setUploadedMediaAssetId(upload.assetId);
                                      setUploadedMediaName(file.name);
                                      if (previousAssetId && previousAssetId !== upload.assetId) {
                                        void deleteUploadedAdvertisementImage(previousAssetId).catch(() => undefined);
                                      }
                                    } catch (error: any) {
                                      setMediaUploadError(error.message || "The image could not be uploaded.");
                                    } finally {
                                      setIsUploadingMedia(false);
                                    }
                                  }}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF up to 10 MB.</p>
                              {mediaUploadError && <p className="text-sm text-destructive">{mediaUploadError}</p>}
                              {isUploadingMedia && (
                                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading image…
                                </p>
                              )}
                              {field.value && !isUploadingMedia && (
                                <div className="flex items-center gap-3 rounded-md border p-2">
                                  <img src={field.value} alt="Advertisement preview" className="h-12 w-16 rounded object-cover" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs">{uploadedMediaName || "Uploaded image"}</p>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => {
                                        const assetId = uploadedMediaAssetId;
                                        createForm.setValue("mediaUrl", "", { shouldDirty: true, shouldValidate: true });
                                        setUploadedMediaAssetId(null);
                                        setUploadedMediaName("");
                                        if (assetId) void deleteUploadedAdvertisementImage(assetId).catch(() => undefined);
                                      }}
                                    >
                                      Remove image
                                    </Button>
                                  </div>
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createForm.control}
                          name="destinationUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Click Destination (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-medium">Overrides & Targeting (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="geographies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Geographies</FormLabel>
                          <FormControl>
                            <Input placeholder="US, CA, UK" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="languages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Languages</FormLabel>
                          <FormControl>
                            <Input placeholder="en, es" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || isUploadingMedia}>
                    {(createMutation.isPending || isUploadingMedia) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Advertisement
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
                <TableHead>Ad Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Headline</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
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
                    No advertisements found.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((ad) => (
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
                    <TableCell>
                      <DeleteAdvertisementButton id={ad.id} />
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
