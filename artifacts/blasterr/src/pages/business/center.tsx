import { useLocation, useParams } from "wouter";
import { useGetBusinessCenter, useGetBusinessAnalytics, getGetBusinessCenterQueryKey, getGetBusinessAnalyticsQueryKey, getGetBusinessQueryKey, getListOwnedBusinessesQueryKey, useUpdateBusinessProfile, BusinessProfileUpdateCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Seo } from "@/components/seo";
import { ArrowLeft, Settings, Activity, Users, MessageSquare, Megaphone, Target, ExternalLink, ThumbsUp, Eye, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { useRef, useEffect, useState, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function BusinessCenter() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const targetId = params.targetId || "";
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateBusiness = useUpdateBusinessProfile();
  const [editing, setEditing] = useState(false);
  type BusinessForm = { name: string; location: string; category: typeof BusinessProfileUpdateCategory[keyof typeof BusinessProfileUpdateCategory]; description: string; website: string; email: string; phone: string; imageUrl: string; bannerImageUrl: string };
  const [form, setForm] = useState<BusinessForm>({ name: "", location: "", category: BusinessProfileUpdateCategory.Services, description: "", website: "", email: "", phone: "", imageUrl: "", bannerImageUrl: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { data: center, isLoading: isCenterLoading, isError: isCenterError } = useGetBusinessCenter(targetId, {
    query: { enabled: !!currentUser, retry: false, queryKey: [...getGetBusinessCenterQueryKey(targetId), currentUser?.id ?? "guest"] }
  });
  
  const { data: analytics, isLoading: isAnalyticsLoading } = useGetBusinessAnalytics(targetId, {
    query: { enabled: !!center && !!currentUser, queryKey: [...getGetBusinessAnalyticsQueryKey(targetId), currentUser?.id ?? "guest"] }
  });

  useEffect(() => {
    if (!center) return;
    setForm({ name: center.name, location: center.location, category: center.category as BusinessForm["category"], description: center.description ?? "", website: center.website ?? "", email: center.email ?? "", phone: center.phone ?? "", imageUrl: center.imageUrl ?? "", bannerImageUrl: center.bannerImageUrl ?? "" });
    setAvatarPreview(center.imageUrl ?? "");
    setBannerPreview(center.bannerImageUrl ?? "");
  }, [center]);

  const chooseImage = (file: File | undefined, purpose: "avatar" | "banner") => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast({ title: "Choose a JPG, PNG, WebP, or GIF image.", variant: "destructive" }); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Images must be 10 MB or smaller.", variant: "destructive" }); return;
    }
    const preview = URL.createObjectURL(file);
    if (purpose === "avatar") { setAvatarFile(file); setAvatarPreview(preview); }
    else { setBannerFile(file); setBannerPreview(preview); }
  };

  const uploadImage = async (file: File, purpose: "target-image" | "banner") => {
    const request = await fetch("/api/storage/uploads/request-url", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, purpose }) });
    const details = await request.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
    if (!request.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
    const upload = await fetch(`/api/storage/uploads/${details.assetId}/content`, { method: "PUT", credentials: "include", headers: { "Content-Type": file.type }, body: file });
    if (!upload.ok) throw new Error(`Could not upload the ${purpose} image.`);
    const completed = await fetch(`/api/storage/uploads/${details.assetId}/complete`, { method: "POST", credentials: "include" });
    const result = await completed.json() as { objectPath?: string; status?: string; error?: string };
    if (!completed.ok || result.status !== "ready" || !result.objectPath) throw new Error(result.error || `Could not verify the ${purpose} image.`);
    return `/api/storage${result.objectPath}`;
  };

  const saveBusiness = async () => {
    try {
      const [imageUrl, bannerImageUrl] = await Promise.all([
        avatarFile ? uploadImage(avatarFile, "target-image") : Promise.resolve(form.imageUrl),
        bannerFile ? uploadImage(bannerFile, "banner") : Promise.resolve(form.bannerImageUrl),
      ]);
      const updated = await updateBusiness.mutateAsync({ targetId, data: { ...form, imageUrl, bannerImageUrl } });
      setForm((current) => ({ ...current, name: updated.name, location: updated.location, category: updated.category as BusinessForm["category"], description: updated.description ?? "", website: updated.website ?? "", email: updated.email ?? "", phone: updated.phone ?? "", imageUrl: updated.imageUrl ?? "", bannerImageUrl: updated.bannerImageUrl ?? "" }));
      setAvatarFile(null); setBannerFile(null); setAvatarPreview(updated.imageUrl ?? ""); setBannerPreview(updated.bannerImageUrl ?? "");
      await queryClient.invalidateQueries({ queryKey: getGetBusinessCenterQueryKey(targetId) });
      await queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(updated.slug) });
      await queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() });
      setEditing(false);
      toast({ title: "Business profile saved." });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Business profile could not be saved.", variant: "destructive" });
    }
  };

  if (isCenterLoading) {
    return (
      <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-1/4 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isCenterError || !center) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center bg-background">
        <Target className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You do not have permission to view this Business Center.</p>
        <Button onClick={() => setLocation("/business")} variant="outline">
          Return to Directory
        </Button>
      </div>
    );
  }

  return (
    <>
      <Seo title={`${center.name} - Business Center | BLASTERR`} description="Manage your business presence on BLASTERR." />
      
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/business/${center.slug}`)}
              className="rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <span className="font-display font-bold text-lg text-white leading-none block">{center.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Business Center</span>
            </div>
          </div>
          
           <Button variant="ghost" size="sm" onClick={() => setEditing((value) => !value)} className="text-muted-foreground hover:text-white">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6 md:space-y-8 pb-24 md:pb-12">
          {/* Welcome & Quick Actions */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-card p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                {center.imageUrl ? (
                  <img src={center.imageUrl} alt={center.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Target className="w-6 h-6 text-muted-foreground" /></div>
                )}
              </div>

          {editing && <section className="space-y-5 rounded-3xl border border-primary/20 bg-card/70 p-5">
            <h2 className="text-xl font-bold text-white">Edit business profile</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-semibold text-white">Business name</span><Input value={form.name} maxLength={160} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="space-y-2"><span className="text-sm font-semibold text-white">City or location</span><Input value={form.location} maxLength={160} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
            </div>
            <label className="block space-y-2"><span className="text-sm font-semibold text-white">Category</span><Select value={form.category} onValueChange={(category) => setForm({ ...form, category: category as typeof form.category })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.values(BusinessProfileUpdateCategory).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></label>
            <label className="block space-y-2"><span className="text-sm font-semibold text-white">About the business</span><Textarea value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="grid gap-4 md:grid-cols-3">
              <Input placeholder="Website" maxLength={500} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <Input placeholder="Email" type="email" maxLength={320} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Phone" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <BusinessImagePicker label="Logo" preview={avatarPreview} file={avatarFile} inputRef={avatarInputRef} onPick={(file) => chooseImage(file, "avatar")} />
              <BusinessImagePicker label="Banner" preview={bannerPreview} file={bannerFile} inputRef={bannerInputRef} onPick={(file) => chooseImage(file, "banner")} banner />
            </div>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF images up to 10 MB.</p>
            <Button onClick={saveBusiness} disabled={updateBusiness.isPending || !form.name.trim() || !form.location.trim()} className="bg-primary text-primary-foreground">{updateBusiness.isPending ? "Saving…" : "Save business profile"}</Button>
          </section>}
              <div>
                <h2 className="text-2xl font-bold text-white">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">Role: <span className="capitalize text-white/80">{center.membershipRole}</span></p>
              </div>
            </div>
            
            <div className="relative z-10 flex gap-3 w-full md:w-auto">
              <Button onClick={() => setLocation(`/business/${center.slug}`)} variant="outline" className="flex-1 md:flex-none border-white/10">
                <ExternalLink className="w-4 h-4 mr-2" /> View Public
              </Button>
              <Button disabled className="flex-1 md:flex-none bg-purple-500/20 text-purple-300 hover:bg-purple-500/20 border-purple-500/30">
                <Rocket className="w-4 h-4 mr-2" /> Promote (Soon)
              </Button>
            </div>
          </div>

          {/* Analytics Grid */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Performance Analytics
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isAnalyticsLoading || !analytics ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-card border border-white/5" />)
              ) : (
                <>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Blasts</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.blastCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Views</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.viewCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Followers</span>
                    <span className="text-3xl font-display font-bold text-white">{analytics.followerCount}</span>
                  </div>
                  <div className="bg-card p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col justify-between shadow-[inset_0_0_20px_rgba(229,244,3,0.05)]">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Engagement</span>
                    <span className="text-3xl font-display font-bold text-primary">{(analytics.engagementRate * 100).toFixed(1)}%</span>
                  </div>
                </>
              )}
            </div>
            
            {analytics && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-card p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comments</span>
                  <span className="font-bold text-white">{analytics.commentCount}</span>
                </div>
                <div className="bg-card p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Reactions</span>
                  <span className="font-bold text-white">{analytics.reactionCount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Respond Guidance / Activity */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Recent Conversations
              </h3>
              <span className="text-xs text-muted-foreground">Jump into the discussion</span>
            </div>
            
            <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
              {center.blasts?.length ? (
                <div className="divide-y divide-white/5">
                  {center.blasts.map((blast: any) => (
                    <BlastCard key={blast.id} blast={blast} showTarget={false} showMedia />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white font-medium">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    When users blast about your business, they'll appear here so you can read, react, and reply.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function BusinessImagePicker({ label, preview, file, inputRef, onPick, banner = false }: {
  label: string;
  preview: string;
  file: File | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void;
  banner?: boolean;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/20 ${banner ? "h-28" : "h-28 w-28"}`}>
        {preview ? <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image selected</div>}
      </div>
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="rounded-full border-white/20">
        {file ? "Change file" : `Select ${label.toLowerCase()}`}
      </Button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => onPick(event.target.files?.[0])} />
      {file && <p className="max-w-full truncate text-xs text-primary">Selected: {file.name}</p>}
    </div>
  );
}
