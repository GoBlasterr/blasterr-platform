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
import type { Target } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Image as ImageIcon, MapPin, Target as TargetIcon, Search, 
  Loader2, Plus, X, Eye, Flame, Zap, Crosshair, CheckCircle2, Trash 
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

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

const BLAST_MODES = [
  { id: "recon", label: "Recon", description: "Sharing intel & raw facts.", icon: Eye, prompt: "What intel do you have on this target?" },
  { id: "hot-take", label: "Hot Take", description: "Unpopular opinions welcome.", icon: Flame, prompt: "Drop your hot take here..." },
  { id: "hype", label: "Hype", description: "Give a massive shoutout.", icon: Zap, prompt: "Why is this target top tier?" },
  { id: "roast", label: "Roast", description: "Call it out. No holding back.", icon: Crosshair, prompt: "What's the issue here?" },
];

const StageCard = ({
  step,
  title,
  isActive,
  isCompleted,
  onEdit,
  children,
  summary,
}: {
  step: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  onEdit?: () => void;
  children: React.ReactNode;
  summary?: React.ReactNode;
}) => {
  return (
    <div className={`transition-all duration-500 ease-in-out ${isActive ? 'opacity-100 scale-100' : isCompleted ? 'opacity-70 scale-[0.98]' : 'opacity-30 pointer-events-none scale-[0.98]'} relative mb-4`}>
      <div className={`rounded-3xl border ${isActive ? 'border-primary/30 bg-card/60 shadow-[0_0_40px_rgba(229,244,3,0.05)]' : 'border-white/5 bg-black/40'} backdrop-blur-xl overflow-hidden`}>
        <div className="p-5 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-display font-bold text-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(229,244,3,0.4)]' : isCompleted ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'}`}>
              {isCompleted && !isActive ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            <div>
              <h2 className={`font-display text-xl md:text-2xl font-bold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>
                {title}
              </h2>
              {isCompleted && !isActive && summary && (
                <div className="text-sm text-primary mt-1 font-medium flex items-center gap-2">
                  {summary}
                </div>
              )}
            </div>
          </div>
          {isCompleted && !isActive && (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="text-muted-foreground hover:text-white rounded-full">
              Edit
            </Button>
          )}
        </div>
        
        <div className={`grid transition-all duration-500 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-5 md:p-6 pt-0 border-t border-white/5 mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CreateBlast() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateBlast();
  const createTargetMutation = useCreateTarget();
  
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [blastMode, setBlastMode] = useState<string>("");
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  
  const [targetQuery, setTargetQuery] = useState("");
  const debouncedQuery = useDebounce(targetQuery, 300);
  const searchParams = { q: debouncedQuery, type: 'targets' as const };
  const {
    data: searchResults,
    isLoading: isSearching,
    isError: isSearchError,
    refetch: retrySearch,
  } = useSearch(searchParams, {
    query: {
      enabled: debouncedQuery.length > 2,
      queryKey: getSearchQueryKey(searchParams),
    },
  });
  
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [isCreatingTarget, setIsCreatingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState<NewTarget>({
    name: "",
    type: "other",
    location: "",
    description: "",
  });

  const form = useForm<z.infer<typeof blastSchema>>({
    resolver: zodResolver(blastSchema),
    mode: "onChange",
    defaultValues: {
      content: "",
      targetId: "",
      location: "",
      mediaUrl: "",
      mediaType: undefined,
    },
  });

  const handleTargetSelect = (t: Target) => {
    setSelectedTarget(t);
    form.setValue("targetId", t.id, { shouldValidate: true });
    setStage(2);
  };

  const handleModeSelect = (mode: typeof BLAST_MODES[0]) => {
    setBlastMode(mode.id);
    setStage(3);
  };

  const handleCreateTarget = () => {
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
          handleTargetSelect(target);
          setTargetQuery("");
          setIsCreatingTarget(false);
          setNewTarget({ name: "", type: "other", location: "", description: "" });
          toast({ title: "Target locked on." });
        },
        onError: () => {
          toast({ title: "Could not create Target", variant: "destructive" });
        },
      }
    );
  };

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

  const removeImage = () => {
    setImagePreview("");
    form.setValue("mediaUrl", "", { shouldValidate: true });
    form.setValue("mediaType", undefined, { shouldValidate: true });
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

  const activeMode = BLAST_MODES.find(m => m.id === blastMode);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background relative z-10">
      <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to feed without publishing"
          onClick={() => setLocation("/home")}
          className="rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-display font-bold text-xl text-white">Create Blast</span>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 max-w-2xl mx-auto w-full">
        <Form {...form}>
          <form className="space-y-2">
            
            {/* STAGE 1: TARGET LOCK */}
            <StageCard 
              step={1}
              isActive={stage === 1} 
              isCompleted={!!selectedTarget} 
              title="Lock Onto Target" 
              summary={selectedTarget && <><TargetIcon className="w-4 h-4"/> {selectedTarget.name}</>}
              onEdit={() => setStage(1)}
            >
              <div className="space-y-4">
                {!isCreatingTarget ? (
                  <>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Enter target designation..." 
                        className="pl-12 bg-black/40 border-white/10 h-14 rounded-2xl text-lg focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all shadow-inner"
                        value={targetQuery}
                        onChange={e => setTargetQuery(e.target.value)}
                      />
                      {targetQuery && (
                        <button
                          type="button"
                          aria-label="Clear Target search"
                          onClick={() => setTargetQuery("")}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden min-h-[200px] flex flex-col relative">
                      {isSearching ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-primary">
                          <div className="relative">
                            <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                            <TargetIcon className="w-10 h-10 animate-pulse relative z-10" />
                          </div>
                          <span className="text-sm font-bold uppercase tracking-widest mt-6 animate-pulse text-primary/80">Scanning Subspace...</span>
                        </div>
                      ) : isSearchError ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                          <p className="text-white font-bold text-lg">Target scan interrupted</p>
                          <p className="mt-2 max-w-[280px] text-sm text-muted-foreground">
                            We could not search Targets right now. Your draft is still safe.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void retrySearch()}
                            className="mt-5 rounded-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            Retry Search
                          </Button>
                        </div>
                      ) : searchResults?.targets?.length ? (
                        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                          {searchResults.targets.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleTargetSelect(t)}
                              className="w-full p-4 hover:bg-white/5 flex items-center justify-between group transition-all text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-primary/30 shadow-inner">
                                  {t.imageUrl ? <img src={t.imageUrl} alt="" className="w-full h-full object-cover" /> : <TargetIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-lg group-hover:text-primary transition-colors leading-tight">{t.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                    <span className="uppercase tracking-wider font-bold text-[10px] text-primary/70">{t.type}</span>
                                    {t.location && <span className="opacity-50 text-white truncate max-w-[120px]">• {t.location}</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_10px_rgba(229,244,3,0.2)]">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : debouncedQuery.length > 2 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Search className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-white font-bold text-lg mb-1">Target Not Found</p>
                          <p className="text-muted-foreground text-sm mb-6 max-w-[250px] mx-auto leading-relaxed">
                            No matching entity in the database. Initialize a new target lock.
                          </p>
                          <Button
                            type="button"
                            onClick={() => {
                              setNewTarget((current) => ({ ...current, name: targetQuery.trim() }));
                              setIsCreatingTarget(true);
                            }}
                            className="rounded-full bg-white/10 hover:bg-white/20 text-white font-bold border border-white/5"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Initialize Target
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
                          <TargetIcon className="w-16 h-16 mx-auto mb-4 stroke-1 text-muted-foreground" />
                          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Awaiting Input</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                      <div>
                        <h3 className="font-display font-bold text-xl text-primary flex items-center gap-2">
                          <Plus className="w-5 h-5" /> Initialize Target
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Register a new entity in the system.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Cancel new Target"
                        onClick={() => setIsCreatingTarget(false)}
                        className="rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label htmlFor="new-target-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Designation</label>
                        <Input
                          id="new-target-name"
                          autoFocus
                          value={newTarget.name}
                          onChange={(e) => setNewTarget({ ...newTarget, name: e.target.value })}
                          placeholder="Enter target name"
                          className="bg-black/50 h-14 rounded-xl border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-lg shadow-inner"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="new-target-type" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Classification</label>
                          <div className="relative">
                            <select
                              id="new-target-type"
                              value={newTarget.type}
                              onChange={(e) => setNewTarget({ ...newTarget, type: e.target.value as any })}
                              className="w-full h-14 rounded-xl border border-white/10 bg-black/50 px-4 text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 appearance-none shadow-inner cursor-pointer"
                            >
                              {targetTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                              ▼
                            </div>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="new-target-location" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Sector / Location</label>
                          <Input
                            id="new-target-location"
                            value={newTarget.location}
                            onChange={(e) => setNewTarget({ ...newTarget, location: e.target.value })}
                            placeholder="Where are they based?"
                            className="bg-black/50 h-14 rounded-xl border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 shadow-inner"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="new-target-description" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Intel (Description)</label>
                        <Textarea
                          id="new-target-description"
                          value={newTarget.description}
                          onChange={(e) => setNewTarget({ ...newTarget, description: e.target.value })}
                          placeholder="Brief background on this target..."
                          className="min-h-[100px] resize-none bg-black/50 rounded-xl border-white/10 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 p-4 shadow-inner"
                        />
                      </div>
                      
                      <div className="flex justify-end pt-4 mt-2 border-t border-white/5">
                        <Button
                          type="button"
                          disabled={!newTarget.name.trim() || createTargetMutation.isPending}
                          onClick={handleCreateTarget}
                          className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_20px_rgba(229,244,3,0.2)] disabled:shadow-none text-lg transition-all w-full sm:w-auto"
                        >
                          {createTargetMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <TargetIcon className="w-5 h-5 mr-2" />}
                          {createTargetMutation.isPending ? "Locking On..." : "Confirm Lock"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </StageCard>

            {/* STAGE 2: CHOOSE BLAST MODE */}
            <StageCard 
              step={2}
              isActive={stage === 2} 
              isCompleted={!!blastMode} 
              title="Choose Blast Mode" 
              summary={activeMode && <><activeMode.icon className="w-4 h-4"/> {activeMode.label}</>}
              onEdit={() => setStage(2)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BLAST_MODES.map(mode => {
                  const isSelected = blastMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleModeSelect(mode)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left group ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(229,244,3,0.15)]' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white group-hover:bg-primary/20 group-hover:text-primary'}`}>
                        <mode.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-white group-hover:text-primary transition-colors'}`}>{mode.label}</div>
                        <div className="text-sm text-muted-foreground mt-0.5 leading-snug">{mode.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StageCard>

            {/* STAGE 3: START BLASTING */}
            <StageCard 
              step={3}
              isActive={stage === 3} 
              isCompleted={false} 
              title="Start Blasting" 
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative border border-white/10 rounded-2xl bg-card/40 focus-within:border-primary/50 focus-within:bg-card/80 transition-colors overflow-hidden">
                        <Textarea 
                          placeholder={activeMode?.prompt || "What's your read on this target?"} 
                          className="min-h-[180px] resize-none bg-transparent border-0 focus-visible:ring-0 p-5 text-xl text-white placeholder:text-muted-foreground/50 shadow-none"
                          {...field}
                        />
                        
                        {/* Attachments Area */}
                        {(imagePreview || form.watch("location")) && (
                           <div className="px-5 pb-4 flex flex-wrap gap-2">
                             {form.watch("location") && (
                               <span className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white/10 text-white rounded-lg text-sm font-medium border border-white/5">
                                 <MapPin className="w-3.5 h-3.5 text-primary" />
                                 <span className="truncate max-w-[200px]">{form.watch("location")}</span>
                                  <button
                                    type="button"
                                    aria-label="Remove attached location"
                                    onClick={() => form.setValue("location", "", { shouldValidate: true })}
                                    className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                                  >
                                   <X className="w-3 h-3" />
                                 </button>
                               </span>
                             )}
                             {imagePreview && (
                               <div className="relative group rounded-lg overflow-hidden border border-white/10 w-32 h-24">
                                  <img src={imagePreview} alt="Blast attachment preview" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-start justify-end p-1.5 bg-gradient-to-bl from-black/70 via-transparent to-transparent">
                                    <button
                                      type="button"
                                      aria-label="Remove attached image"
                                      onClick={removeImage}
                                      className="text-white bg-black/70 p-2 rounded-full hover:bg-destructive hover:text-white transition-colors"
                                    >
                                     <Trash className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                             )}
                           </div>
                        )}

                        {/* Toolbar & Counter */}
                        <div className="flex items-center justify-between border-t border-white/5 bg-black/20 p-3">
                           <div className="flex items-center gap-1">
                             <input
                               ref={imageInputRef}
                               type="file"
                               accept="image/*"
                               className="sr-only"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 e.target.value = "";
                                 if (file) void handleImageSelected(file);
                               }}
                             />
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button
                                   type="button"
                                   variant="ghost"
                                   size="icon"
                                   disabled={isUploadingImage || !!imagePreview}
                                   onClick={() => imageInputRef.current?.click()}
                                   className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 w-10 h-10"
                                 >
                                   {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent>Attach Image</TooltipContent>
                             </Tooltip>

                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button
                                   type="button"
                                   variant="ghost"
                                   size="icon"
                                   disabled={isLocating || !!form.watch("location")}
                                   onClick={handleLocation}
                                   className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 w-10 h-10"
                                 >
                                   {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent>Attach Location</TooltipContent>
                             </Tooltip>
                           </div>
                           
                           <div className={`text-sm font-bold ${field.value.length > 1000 ? 'text-destructive' : field.value.length > 900 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                             {field.value.length} <span className="opacity-50">/ 1000</span>
                           </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2 pl-2 text-destructive font-medium" />
                  </FormItem>
                )}
              />

              {/* Pre-Fire Summary */}
              <div className="mt-6 p-5 rounded-2xl bg-black/40 border border-white/5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Pre-Fire Check
                </h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex justify-between items-center">
                    <span className="text-muted-foreground">Target Lock</span>
                    <span className="text-white font-bold flex items-center gap-2">
                      {selectedTarget?.name} <TargetIcon className="w-3 h-3 text-primary" />
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-muted-foreground">Blast Mode</span>
                    <span className="text-white font-bold flex items-center gap-2">
                      {activeMode?.label} {activeMode && <activeMode.icon className="w-3 h-3 text-primary" />}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payload Size</span>
                    <span className={`${form.watch("content").length > 1000 ? 'text-destructive' : 'text-white'} font-bold`}>
                      {form.watch("content").length} chars
                    </span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setLocation("/home")}
                  className="h-14 px-8 rounded-full text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isUploadingImage || createMutation.isPending || form.watch("content").length > 1000}
                  className="h-14 px-10 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-[0_0_30px_rgba(229,244,3,0.2)] hover:shadow-[0_0_40px_rgba(229,244,3,0.4)] disabled:opacity-50 disabled:shadow-none text-lg transition-all"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                  ) : (
                    <Crosshair className="w-6 h-6 mr-3" />
                  )}
                  {createMutation.isPending ? "Firing Payload..." : "Fire Blast"}
                </Button>
              </div>
            </StageCard>

          </form>
        </Form>
      </main>
    </div>
  );
}
