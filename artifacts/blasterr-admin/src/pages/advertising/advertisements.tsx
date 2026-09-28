import { useState, useMemo } from "react";
import { 
  useListAdminAdvertisements, 
  useCreateAdminAdvertisement,
  useUpdateAdminAdvertisement,
  getListAdminAdvertisementsQueryKey,
  useListAdminAdvertisers,
  useListAdminCampaigns,
  useListAdminAdGroups,
  useListAdminCreatives,
  type Advertisement,
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
import { Search, Loader2, Plus, ExternalLink, Pencil } from "lucide-react";
import { useForm as useReactHookForm } from "react-hook-form";
import { DeleteAdvertisementButton } from "./delete-advertisement-button";

function isHttpUrlOrStoredMediaPath(value: string): boolean {
  if (/^\/api\/storage\/objects\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.[A-Za-z0-9]+$/.test(value)) {
    return true;
  }
  return isHttpUrl(value);
}

function isHttpUrl(value: string): boolean {
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
  homeFeedHeight: z.enum(["small", "medium", "large"]),
  headline: z.string().max(200, "Headline must be 200 characters or fewer").optional(), // Now optional since creativeId can provide it
  body: z.string().max(1000).optional(),
  mediaUrl: z.string().max(2000).refine(isHttpUrlOrStoredMediaPath, "Upload an image or enter a valid HTTP(S) URL").optional().or(z.literal('')),
  destinationUrl: z.string().max(2000).refine(value => !value || isHttpUrl(value), "Must be an absolute HTTP(S) URL").optional().or(z.literal('')),
  // Targeting
  geographies: z.string().optional(),
  languages: z.string().optional(),
  devices: z.string().optional(),
  interests: z.string().optional(),
  categories: z.string().optional(),
  keywords: z.string().optional(),
  exclusions: z.string().optional(),
}).superRefine((values, ctx) => {
  const validateList = (
    field: "geographies" | "languages" | "devices" | "interests" | "categories" | "keywords" | "exclusions",
    value: string | undefined,
    maxItems: number,
    isValidItem: (item: string) => boolean,
    itemMessage: string,
  ) => {
    const items = value?.split(",").map(item => item.trim()).filter(Boolean) ?? [];
    if (items.length > maxItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `Use no more than ${maxItems} comma-separated values.`,
      });
    }
    if (items.some(item => !isValidItem(item))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: itemMessage });
    }
  };

  validateList("geographies", values.geographies, 50, item => /^[A-Za-z0-9][A-Za-z0-9 _-]{1,79}$/.test(item), "Each geography must be 2–80 letters, numbers, spaces, underscores, or hyphens.");
  validateList("languages", values.languages, 20, item => /^[a-z]{2}(-[A-Z]{2})?$/.test(item), "Use language codes like en or en-US.");
  validateList("devices", values.devices, 3, item => ["mobile", "tablet", "desktop"].includes(item.toLowerCase()), "Use mobile, tablet, or desktop.");
  validateList("interests", values.interests, 50, item => item.length <= 80, "Each interest must be 80 characters or fewer.");
  validateList("categories", values.categories, 50, item => item.length <= 80, "Each category must be 80 characters or fewer.");
  validateList("keywords", values.keywords, 100, item => item.length <= 80, "Each keyword must be 80 characters or fewer.");
  validateList("exclusions", values.exclusions, 100, item => item.length <= 80, "Each exclusion must be 80 characters or fewer.");
});

const emptyAdFormValues: z.infer<typeof createAdSchema> = {
  advertiserId: "",
  campaignId: "",
  adGroupId: "",
  creativeId: "",
  name: "",
  placement: "home_feed",
  homeFeedHeight: "medium",
  headline: "",
  body: "",
  mediaUrl: "",
  destinationUrl: "",
  geographies: "",
  languages: "",
  devices: "",
  interests: "",
  categories: "",
  keywords: "",
  exclusions: "",
};

export default function AdvertisementsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAdFormOpen, setIsAdFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
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
  const { data: adGroupsData } = useListAdminAdGroups({ limit: 100 } as any);
  const { data: creativesData } = useListAdminCreatives({ limit: 100 } as any);

  const createMutation = useCreateAdminAdvertisement();
  const updateMutation = useUpdateAdminAdvertisement();

  const createForm = useReactHookForm<z.infer<typeof createAdSchema>>({
    resolver: zodResolver(createAdSchema),
    defaultValues: emptyAdFormValues,
  });

  const clearFormState = (removeUncommittedUpload: boolean) => {
    if (removeUncommittedUpload && uploadedMediaAssetId) {
      void deleteUploadedAdvertisementImage(uploadedMediaAssetId).catch(() => undefined);
    }
    setIsAdFormOpen(false);
    setEditingAd(null);
    createForm.reset(emptyAdFormValues);
    setUploadedMediaAssetId(null);
    setUploadedMediaName("");
    setMediaUploadError("");
  };

  const openEditForm = (ad: Advertisement) => {
    const campaign = campaignsData?.items.find(item => item.id === ad.campaignId);
    const languageValues = ad.targeting.languages?.map(value => {
      const [language, region] = value.split("-");
      return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
    });
    setEditingAd(ad);
    createForm.reset({
      advertiserId: campaign?.advertiserId ?? "",
      campaignId: ad.campaignId,
      adGroupId: ad.adGroupId ?? "none",
      creativeId: ad.creativeId ?? "none",
      name: ad.name,
      placement: ad.placement as z.infer<typeof createAdSchema>["placement"],
      homeFeedHeight: ad.homeFeedHeight,
      headline: ad.headline,
      body: ad.body,
      mediaUrl: ad.mediaUrl ?? "",
      destinationUrl: ad.destinationUrl ?? "",
      geographies: ad.targeting.geographies?.join(", ") ?? "",
      languages: languageValues?.join(", ") ?? "",
      devices: ad.targeting.devices?.join(", ") ?? "",
      interests: ad.targeting.interests?.join(", ") ?? "",
      categories: ad.targeting.categories?.join(", ") ?? "",
      keywords: ad.targeting.keywords?.join(", ") ?? "",
      exclusions: ad.targeting.exclusions?.join(", ") ?? "",
    });
    setUploadedMediaAssetId(null);
    setUploadedMediaName("");
    setMediaUploadError("");
    setIsAdFormOpen(true);
  };

  const onSubmitAdForm = (values: z.infer<typeof createAdSchema>) => {
    const toArray = (str?: string) => str ? str.split(",").map(s => s.trim()).filter(Boolean) : undefined;

    const linkedCreativeId = values.creativeId && values.creativeId !== "none" ? values.creativeId : undefined;
    const finalHeadline = linkedCreativeId && !values.headline ? "Pending Creative Link" : values.headline || "";

    if (!linkedCreativeId && !finalHeadline) {
      createForm.setError("headline", { type: "manual", message: "Headline is required if no creative is selected." });
      return;
    }

    const targetingValues = {
      geographies: toArray(values.geographies),
      languages: toArray(values.languages),
        devices: toArray(values.devices)?.map(value => value.toLowerCase() as "mobile" | "tablet" | "desktop"),
      interests: toArray(values.interests),
      categories: toArray(values.categories),
      keywords: toArray(values.keywords),
      exclusions: toArray(values.exclusions),
    };
    const finishSave = (updated: Advertisement | undefined, created: boolean) => {
      toast({
        title: created ? "Advertisement Created" : "Advertisement Updated",
        description: created
          ? "The ad has been queued for review."
          : updated?.status === "pending_approval" && editingAd?.status !== "pending_approval"
            ? "Delivery or creative changes are queued for fresh review."
            : "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey() });
      clearFormState(false);
    };

    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, data: {
        campaignId: values.campaignId,
        adGroupId: values.adGroupId && values.adGroupId !== "none" ? values.adGroupId : null,
        creativeId: linkedCreativeId ?? null,
        name: values.name,
        placement: values.placement,
        homeFeedHeight: values.homeFeedHeight,
        headline: finalHeadline,
        body: values.body ?? "",
        mediaUrl: values.mediaUrl?.trim() || null,
        destinationUrl: values.destinationUrl?.trim() || null,
        targeting: {
          geographies: targetingValues.geographies ?? [],
          languages: targetingValues.languages ?? [],
          devices: targetingValues.devices ?? [],
          interests: targetingValues.interests ?? [],
          categories: targetingValues.categories ?? [],
          keywords: targetingValues.keywords ?? [],
          exclusions: targetingValues.exclusions ?? [],
        },
      }}, {
        onSuccess: updated => finishSave(updated, false),
        onError: (err: any) => toast({ title: "Update Failed", description: err.data?.error || err.message || "An error occurred", variant: "destructive" }),
      });
      return;
    }

    createMutation.mutate({ data: {
      campaignId: values.campaignId,
      adGroupId: values.adGroupId && values.adGroupId !== "none" ? values.adGroupId : undefined,
      creativeId: linkedCreativeId,
      name: values.name,
      placement: values.placement as any,
      homeFeedHeight: values.homeFeedHeight,
      headline: finalHeadline,
      body: values.body || undefined,
      mediaUrl: values.mediaUrl || undefined,
      destinationUrl: values.destinationUrl || undefined,
      targeting: targetingValues,
    }}, {
      onSuccess: created => finishSave(created, true),
      onError: (err: any) => {
        toast({ title: "Creation Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const selectedCreativeId = createForm.watch("creativeId");
  const selectedAdvertiserId = createForm.watch("advertiserId");
  const selectedCampaignId = createForm.watch("campaignId");
  const selectedAdGroupId = createForm.watch("adGroupId");
  const selectedPlacement = createForm.watch("placement");
  const isCreativeSelected = !!selectedCreativeId && selectedCreativeId !== "none";
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const campaignsForAdvertiser = useMemo(
    () => campaignsData?.items.filter(campaign => campaign.advertiserId === selectedAdvertiserId) ?? [],
    [campaignsData, selectedAdvertiserId],
  );
  const adGroupsForCampaign = useMemo(
    () => adGroupsData?.items.filter(group =>
      group.campaignId === selectedCampaignId && (group.status === "active" || group.id === selectedAdGroupId),
    ) ?? [],
    [adGroupsData, selectedCampaignId, selectedAdGroupId],
  );
  const creativesForAdvertiser = useMemo(
    () => creativesData?.items.filter(creative =>
      creative.advertiserId === selectedAdvertiserId && (creative.status === "active" || (editingAd?.creativeId === creative.id && selectedCreativeId === creative.id)),
    ) ?? [],
    [creativesData, selectedAdvertiserId, editingAd?.creativeId, selectedCreativeId],
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertisements</h1>
          <p className="text-muted-foreground">Manage individual ad placements and status.</p>
        </div>
        
        <Dialog
          open={isAdFormOpen}
          onOpenChange={(open) => {
            if (open) {
              setEditingAd(null);
              createForm.reset(emptyAdFormValues);
              setUploadedMediaAssetId(null);
              setUploadedMediaName("");
              setMediaUploadError("");
              setIsAdFormOpen(true);
            } else {
              clearFormState(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAd ? "Edit Advertisement" : "Create Advertisement"}</DialogTitle>
              <DialogDescription>
                {editingAd
                  ? "Update the ad details. Changes to creative or delivery settings will require fresh review."
                  : "Create a new ad. Select an existing creative to inherit its content automatically."}
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitAdForm)} className="space-y-6">
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

                {selectedPlacement === "home_feed" && (
                  <FormField
                    control={createForm.control}
                    name="homeFeedHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Home Feed Ad Size</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an ad size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="small">Small - 128 px tall</SelectItem>
                            <SelectItem value="medium">Medium - 256 px tall</SelectItem>
                            <SelectItem value="large">Large - 384 px tall</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          The image fills the existing feed width; this setting controls its height.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="devices"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Devices</FormLabel>
                          <FormControl>
                            <Input placeholder="mobile, tablet, desktop" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="interests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interests</FormLabel>
                          <FormControl>
                            <Input placeholder="outdoors, cooking" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categories</FormLabel>
                          <FormControl>
                            <Input placeholder="food, travel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="summer sale, new" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="exclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Excluded Keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="competitor, discontinued" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => clearFormState(true)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving || isUploadingMedia}>
                    {(isSaving || isUploadingMedia) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingAd ? "Save Changes" : "Create Advertisement"}
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
                placeholder="Search advertisements..."
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Edit ${ad.name}`}
                          disabled={ad.status === "deleted"}
                          onClick={() => openEditForm(ad)}
                        >
                          <Pencil className="h-4 w-4 mr-1.5" />
                          Edit
                        </Button>
                        <DeleteAdvertisementButton id={ad.id} />
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
