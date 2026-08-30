import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  useCreateBlast,
  useCreateTarget,
  useSearch,
  getGetFeedQueryKey,
  getSearchQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Image as ImageIcon, MapPin, Target as TargetIcon, Search, Loader2, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; // We'll create this

const blastSchema = z.object({
  content: z.string().min(1, "Enter some text").max(1000, "Too long"),
  targetId: z.string().min(1, "Select a target"),
  location: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

const targetTypeOptions = [
  { value: "person", label: "Person" },
  { value: "business", label: "Business" },
  { value: "place", label: "Place" },
  { value: "product", label: "Product" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
  { value: "gaming", label: "Gaming" },
  { value: "other", label: "Other" },
] as const;

type NewTarget = {
  name: string;
  type: (typeof targetTypeOptions)[number]["value"];
  location: string;
  description: string;
};

export default function CreateBlast() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateBlast();
  const createTargetMutation = useCreateTarget();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [targetQuery, setTargetQuery] = useState("");
  const debouncedQuery = useDebounce(targetQuery, 300);
  const searchParams = { q: debouncedQuery, type: 'targets' as const };
  const { data: searchResults, isLoading: isSearching } = useSearch(searchParams, {
    query: {
      enabled: debouncedQuery.length > 2,
      queryKey: getSearchQueryKey(searchParams),
    },
  });
  
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState<NewTarget>({
    name: "",
    type: "other",
    location: "",
    description: "",
  });

  const form = useForm<z.infer<typeof blastSchema>>({
    resolver: zodResolver(blastSchema),
    defaultValues: {
      content: "",
      targetId: "",
      location: "",
      mediaUrl: "",
      mediaType: undefined,
    },
  });

  const handleImageSelected = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Images must be 10 MB or smaller", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const urlResponse = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const uploadDetails = await urlResponse.json() as { uploadURL?: string; objectPath?: string; error?: string };
      if (!urlResponse.ok || !uploadDetails.uploadURL || !uploadDetails.objectPath) {
        throw new Error(uploadDetails.error || "Could not prepare image upload");
      }

      const uploadResponse = await fetch(uploadDetails.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("Could not upload image");
      }

      form.setValue("mediaUrl", `/api/storage${uploadDetails.objectPath}`, { shouldValidate: true });
      form.setValue("mediaType", "image", { shouldValidate: true });
      toast({ title: "Image attached to your Blast." });
    } catch (error) {
      setImagePreview("");
      toast({
        title: error instanceof Error ? error.message : "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location is not available in this browser", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = Number(coords.latitude.toFixed(5));
        const lon = Number(coords.longitude.toFixed(5));
        setMapCoords({ lat, lon });
        form.setValue("location", `${lat}, ${lon}`, { shouldValidate: true });
        setIsLocating(false);
        toast({ title: "Location attached to your Blast." });
      },
      () => {
        setIsLocating(false);
        toast({
          title: "Location access was not available",
          description: "Allow location access and try again.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const onSubmit = (values: z.infer<typeof blastSchema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          toast({ title: "Blast fired successfully!" });
          setLocation("/home");
        },
        onError: () => {
          toast({ title: "Failed to fire Blast", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative z-10">
      <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/home")} className="rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-display font-bold text-xl text-white">Create Blast</span>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={!form.formState.isValid || createMutation.isPending}
          className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-6 shadow-[0_0_15px_rgba(229,244,3,0.3)] disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fire"}
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Form {...form}>
          <form className="space-y-6 max-w-2xl mx-auto">
            
            {/* Target Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TargetIcon className="w-4 h-4" /> Select Target
                </label>
                {!selectedTarget && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewTarget((current) => ({ ...current, name: targetQuery.trim() }));
                      setIsCreatingTarget(true);
                    }}
                    className="rounded-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create new target
                  </Button>
                )}
              </div>
              
              {selectedTarget ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-primary/50 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                       {selectedTarget.imageUrl ? <img src={selectedTarget.imageUrl} className="w-full h-full object-cover rounded" /> : <TargetIcon className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{selectedTarget.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedTarget.type}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTarget(null); form.setValue("targetId", ""); }} className="text-muted-foreground hover:text-white">
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search for a person, place, product..." 
                      className="pl-9 bg-card border-white/10 h-12 rounded-xl"
                      value={targetQuery}
                      onChange={e => setTargetQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Dropdown results mock */}
                  {(targetQuery.length > 2 || isCreatingTarget) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-xl shadow-xl z-50 overflow-visible">
                      {isCreatingTarget ? (
                        <div className="p-6 space-y-5">
                          <div>
                            <p className="font-bold text-white">Create a new Target</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add the Target you want to lock onto, then continue your Blast.
                            </p>
                          </div>
                          <Input
                            autoFocus
                            value={newTarget.name}
                            onChange={(event) => setNewTarget((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Target name"
                            className="bg-background border-white/10 rounded-lg"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={newTarget.type}
                              onChange={(event) => setNewTarget((current) => ({
                                ...current,
                                type: event.target.value as NewTarget["type"],
                              }))}
                              className="h-10 rounded-lg border border-white/10 bg-background px-3 text-sm text-white outline-none focus:border-primary"
                            >
                              {targetTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <Input
                              value={newTarget.location}
                              onChange={(event) => setNewTarget((current) => ({ ...current, location: event.target.value }))}
                              placeholder="Location"
                              className="bg-background border-white/10 rounded-lg"
                            />
                          </div>
                          <Textarea
                            value={newTarget.description}
                            onChange={(event) => setNewTarget((current) => ({ ...current, description: event.target.value }))}
                            placeholder="What should people know about this Target?"
                            className="min-h-20 resize-none bg-background border-white/10 rounded-lg"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsCreatingTarget(false)}
                              className="text-muted-foreground hover:text-white"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!newTarget.name.trim() || createTargetMutation.isPending}
                              onClick={() => {
                                createTargetMutation.mutate(
                                  {
                                    data: {
                                      ...newTarget,
                                      name: newTarget.name.trim(),
                                      location: newTarget.location.trim(),
                                      description: newTarget.description.trim(),
                                    },
                                  },
                                  {
                                    onSuccess: (target) => {
                                      setSelectedTarget(target);
                                      form.setValue("targetId", target.id, { shouldValidate: true });
                                      setTargetQuery("");
                                      setIsCreatingTarget(false);
                                      setNewTarget({ name: "", type: "other", location: "", description: "" });
                                      toast({ title: "Target locked on." });
                                    },
                                    onError: () => {
                                      toast({ title: "Could not create Target", variant: "destructive" });
                                    },
                                  },
                                );
                              }}
                              className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                            >
                              {createTargetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Target"}
                            </Button>
                          </div>
                        </div>
                      ) : isSearching ? (
                        <div className="p-4 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                      ) : searchResults?.targets?.length ? (
                        searchResults.targets.map(t => (
                          <div 
                            key={t.id} 
                            className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                            onClick={() => {
                              setSelectedTarget(t);
                              form.setValue("targetId", t.id);
                              setTargetQuery("");
                            }}
                          >
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                              {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover rounded" /> : <TargetIcon className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium text-white">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.type}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No targets found.{" "}
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => {
                              setNewTarget((current) => ({ ...current, name: targetQuery.trim() }));
                              setIsCreatingTarget(true);
                            }}
                            className="text-primary px-1 h-auto py-0"
                          >
                            Create new target
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {form.formState.errors.targetId?.message && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.targetId.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Content Input */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="What's your read on this target?" 
                        className="min-h-[150px] resize-none bg-transparent border-0 focus-visible:ring-0 px-0 text-xl text-white placeholder:text-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {imagePreview && (
                <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card/60">
                  <img
                    src={imagePreview}
                    alt="Attached Blast image preview"
                    className="max-h-72 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-muted-foreground">
                    <span>{isUploadingImage ? "Uploading image..." : "Image attached to this Blast"}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploadingImage}
                      onClick={() => {
                        setImagePreview("");
                        form.setValue("mediaUrl", "");
                        form.setValue("mediaType", undefined);
                      }}
                      className="text-muted-foreground hover:text-white"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </form>
        </Form>
      </main>

      {/* Toolbar */}
      <div className="sticky bottom-0 border-t border-white/10 bg-background/80 backdrop-blur-xl p-4 md:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Attach an image"
              onClick={() => imageInputRef.current?.click()}
              disabled={isUploadingImage}
              className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10"
            >
              {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleImageSelected(file);
              }}
            />
            <Button type="button" variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10">
              <MapPin className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {form.watch("content").length} / 1000
          </div>
        </div>
      </div>
    </div>
  );
}
