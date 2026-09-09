import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminPreloadedTargetMetricsQueryKey,
  getListAdminPreloadedTargetsQueryKey,
  getListTargetsQueryKey,
  PreloadedTargetInputType,
  useAdoptAdminPreloadedTarget,
  type Target,
  useConfirmAdminPreloadedImport,
  useCreateAdminPreloadedTarget,
  useEnrichAdminPreloadedTarget,
  useGetAdminPreloadedTargetMetrics,
  useListAdminPreloadedTargets,
  useListTargets,
  usePreviewAdminPreloadedImport,
  useUpdateAdminPreloadedTarget,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Archive, CheckCircle2, Eye, FileUp, MoreHorizontal, Pencil, Plus, Search, Star, Upload, XCircle } from "lucide-react";

const TYPES = Object.values(PreloadedTargetInputType);
type FormState = { name: string; slug: string; type: typeof TYPES[number]; category: string; aliases: string; description: string; imageUrl: string; bannerImageUrl: string; status: "active" | "disabled"; featured: boolean; verified: boolean };
const blankForm = (): FormState => ({ name: "", slug: "", type: "person", category: "", aliases: "", description: "", imageUrl: "", bannerImageUrl: "", status: "active", featured: false, verified: false });
const messageFor = (error: unknown) => error instanceof Error ? error.message : "The request could not be completed. Please try again.";
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function uploadTargetImage(file: File, purpose: "target-image" | "banner" = "target-image"): Promise<string> {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowed.has(file.type)) throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
  const prepared = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, purpose }),
  });
  const details = await prepared.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
  if (!prepared.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || "Could not prepare the image upload.");
  const uploaded = await fetch(details.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!uploaded.ok) throw new Error("Could not upload the image.");
  const completed = await fetch(`/api/storage/uploads/${details.assetId}/complete`, { method: "POST" });
  if (!completed.ok) throw new Error("The uploaded image could not be verified.");
  return `/api/storage${details.objectPath}`;
}

function TargetBannerUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const choose = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadTargetImage(file, "banner"));
      toast({ title: "Banner uploaded", description: "Save the subject to publish this banner." });
    } catch (error) {
      toast({ title: "Banner upload failed", description: messageFor(error), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="space-y-2 sm:col-span-2">
    <div className="text-sm font-medium">Profile banner</div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void choose(event.target.files?.[0])} data-testid="input-preloaded-banner-upload" />
    {value ? <div className="aspect-[3/1] w-full overflow-hidden rounded-sm border bg-muted/30"><img src={value} alt="Banner preview" className="h-full w-full object-cover object-[center_25%]" /></div> : <div className="flex aspect-[3/1] w-full items-center justify-center rounded-sm border bg-muted text-xs text-muted-foreground">No banner</div>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} data-testid="button-upload-preloaded-banner"><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload banner"}</Button>
      {value && <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={uploading}>Remove</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Use a recent, wide image with the subject’s face near the upper center. Maximum 10 MB.</p>
  </div>;
}

function TargetImageUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const choose = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadTargetImage(file));
      toast({ title: "Profile image uploaded", description: "Save the profile to publish this image." });
    } catch (error) {
      toast({ title: "Image upload failed", description: messageFor(error), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="space-y-2 sm:col-span-2">
    <div className="text-sm font-medium">Profile image</div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void choose(event.target.files?.[0])} data-testid="input-preloaded-image-upload" />
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      {value ? <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted/30 p-1"><img src={value} alt="Full profile preview" className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-sm border bg-muted text-xs text-muted-foreground">No image</div>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} data-testid="button-upload-preloaded-image"><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload image"}</Button>
        {value && <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={uploading}>Remove</Button>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">The full image is shown without cropping. JPG, PNG, WebP, or GIF. Maximum 10 MB.</p>
  </div>;
}

function AdoptionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [selected, setSelected] = useState<Target | null>(null);
  const [category, setCategory] = useState("");
  const [aliases, setAliases] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [verified, setVerified] = useState(false);
  const [conflict, setConflict] = useState("");
  const results = useListTargets({ q: searched || undefined }, { query: { queryKey: getListTargetsQueryKey({ q: searched || undefined }), enabled: open && !!searched } });
  const adopt = useAdoptAdminPreloadedTarget();
  const reset = (value: boolean) => { if (value) { setQuery(""); setSearched(""); setSelected(null); setConflict(""); } onOpenChange(value); };
  const choose = (target: Target) => { setSelected(target); setCategory(target.preloadCategory ?? ""); setAliases((target.aliases ?? []).join("\n")); setDescription(target.description ?? ""); setImageUrl(target.imageUrl ?? ""); setFeatured(!!target.featured); setVerified(!!target.verified); setConflict(""); };
  const submit = () => {
    if (!selected || !category.trim()) { toast({ title: "Category is required", description: "Choose a public Target and provide its curated category.", variant: "destructive" }); return; }
    adopt.mutate({ id: selected.id, data: { name: selected.name, slug: selected.slug, type: selected.type, category: category.trim(), aliases: aliases.split(/\n|,/).map((item) => item.trim()).filter(Boolean), description: description.trim() || undefined, imageUrl: imageUrl.trim() || undefined, featured, verified, status: "active" } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminPreloadedTargetsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListTargetsQueryKey() }); toast({ title: "Existing Target adopted", description: "Its ID, activity, and original authorship were preserved." }); onOpenChange(false); },
      onError: (error: unknown) => { const data = error && typeof error === "object" ? (error as { data?: { message?: string; detail?: string } }).data : undefined; const detail = data?.detail || data?.message || messageFor(error); setConflict(detail); toast({ title: "Adoption could not be completed", description: detail, variant: "destructive" }); },
    });
  };
  const publicResults = (results.data ?? []).filter((target) => !target.isPreloaded);
  return <Dialog open={open} onOpenChange={reset}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>Adopt existing Target</DialogTitle><DialogDescription>Adoption marks one existing public Target as canonical in place. Its ID, real activity, and existing Blast authorship are preserved.</DialogDescription></DialogHeader>
    {!selected ? <div className="space-y-4"><div className="flex gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setSearched(query.trim()); }} placeholder="Search public Targets" data-testid="input-search-adopt-target" /><Button onClick={() => setSearched(query.trim())} disabled={!query.trim()} data-testid="button-search-adopt-target"><Search className="h-4 w-4" /></Button></div>
      {results.isLoading && <Skeleton className="h-24 w-full" />}{results.isError && <p className="text-sm text-destructive">{messageFor(results.error)}</p>}
      {searched && !results.isLoading && !publicResults.length && <p className="rounded-sm border p-4 text-sm text-muted-foreground" data-testid="text-no-adoptable-targets">No non-preloaded public Targets matched. Create a new subject instead, or refine the search.</p>}
      <div className="space-y-2">{publicResults.map((target) => <button key={target.id} type="button" onClick={() => choose(target)} className="flex w-full items-center justify-between rounded-sm border p-3 text-left transition-colors hover:bg-muted" data-testid={`button-select-adopt-target-${target.id}`}><div><div className="font-medium">{target.name}</div><div className="font-mono text-xs text-muted-foreground">/{target.slug} · {target.type}</div></div><Badge variant="outline">{target.blastCount.toLocaleString()} blasts</Badge></button>)}</div>
    </div> : <div className="space-y-4"><div className="rounded-sm border bg-muted/30 p-3 text-sm"><strong>{selected.name}</strong><div className="mt-1 font-mono text-xs text-muted-foreground">/{selected.slug} · {selected.type} · {selected.blastCount.toLocaleString()} current Blasts</div></div>
      <p className="text-sm text-muted-foreground">The public Target identity above cannot be changed in this workflow. Add its curated discovery metadata below.</p>
      <label className="block space-y-1 text-sm font-medium">Category<Input value={category} onChange={(event) => setCategory(event.target.value)} data-testid="input-adopt-category" /></label>
      <label className="block space-y-1 text-sm font-medium">Aliases <span className="font-normal text-muted-foreground">(one per line or comma-separated)</span><Textarea value={aliases} onChange={(event) => setAliases(event.target.value)} data-testid="input-adopt-aliases" /></label>
      <label className="block space-y-1 text-sm font-medium">Description<Textarea value={description} onChange={(event) => setDescription(event.target.value)} data-testid="input-adopt-description" /></label>
      <TargetImageUpload value={imageUrl} onChange={setImageUrl} />
      <div className="flex gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} data-testid="checkbox-adopt-featured" />Featured</label><label className="flex items-center gap-2"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} data-testid="checkbox-adopt-verified" />Verified</label></div>
      {conflict && <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" data-testid="text-adoption-conflict"><strong>Conflict requires review.</strong><br />{conflict} Review the existing curated subject and choose a different public Target if they represent the same entity.</div>}
    </div>}
    <DialogFooter>{selected && <Button variant="outline" onClick={() => { setSelected(null); setConflict(""); }} data-testid="button-back-adopt-target">Back to search</Button>}<Button variant="outline" onClick={() => reset(false)} data-testid="button-cancel-adopt-target">Cancel</Button>{selected && <Button onClick={submit} disabled={adopt.isPending} data-testid="button-confirm-adopt-target">{adopt.isPending ? "Adopting…" : "Confirm adoption"}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}

function TargetFormDialog({ target, open, onOpenChange }: { target: Target | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(blankForm);
  const lastAutomaticName = useRef("");
  const create = useCreateAdminPreloadedTarget();
  const enrich = useEnrichAdminPreloadedTarget();
  const update = useUpdateAdminPreloadedTarget();
  const isEditing = !!target;
  const pending = create.isPending || update.isPending || enrich.isPending;
  useEffect(() => {
    if (!open) return;
    lastAutomaticName.current = "";
    setForm(target ? { name: target.name, slug: target.slug, type: target.type, category: target.preloadCategory ?? "", aliases: (target.aliases ?? []).join("\n"), description: target.description ?? "", imageUrl: target.imageUrl ?? "", bannerImageUrl: target.bannerImageUrl ?? "", status: target.preloadStatus === "disabled" ? "disabled" : "active", featured: !!target.featured, verified: !!target.verified } : blankForm());
  }, [open, target?.id]);
  const begin = (value: boolean) => {
    onOpenChange(value);
  };
  const save = () => {
    const data = { name: form.name.trim(), slug: form.slug.trim(), type: form.type, category: form.category.trim(), aliases: form.aliases.split(/\n|,/).map((v) => v.trim()).filter(Boolean), description: form.description.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined, bannerImageUrl: form.bannerImageUrl.trim() || undefined, status: form.status, featured: form.featured, verified: form.verified };
    if (!data.name || !data.slug || !data.category) {
      toast({ title: "Required fields missing", description: "Name, slug, and category are required.", variant: "destructive" }); return;
    }
    const callbacks = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminPreloadedTargetsQueryKey() }); toast({ title: isEditing ? "Subject updated" : "Subject created" }); onOpenChange(false); }, onError: (error: unknown) => toast({ title: "Unable to save subject", description: messageFor(error), variant: "destructive" }) };
    if (target) update.mutate({ id: target.id, data }, callbacks); else create.mutate({ data }, callbacks);
  };
  const autofill = (requestedName = form.name.trim(), automatic = false) => {
    if (requestedName.length < 2) {
      toast({ title: "Enter a name first", description: "Add the person, place, team, product, or organization name.", variant: "destructive" });
      return;
    }
    enrich.mutate({ data: { name: requestedName } }, {
      onSuccess: (proposal) => {
        setForm((current) => ({
          ...current,
          name: proposal.name,
          slug: proposal.slug,
          type: proposal.type,
          category: proposal.category,
          aliases: proposal.aliases.join("\n"),
          description: proposal.description,
          imageUrl: proposal.imageUrl,
          bannerImageUrl: proposal.bannerImageUrl,
        }));
        toast({ title: "Profile fields populated", description: "Review the information and image, then save when ready." });
      },
      onError: (error: unknown) => {
        if (!automatic) toast({ title: "Profile autofill failed", description: messageFor(error), variant: "destructive" });
      },
    });
  };
  useEffect(() => {
    const requestedName = form.name.trim();
    const hasManualProfileData = !!(form.category.trim() || form.aliases.trim() || form.description.trim() || form.imageUrl.trim());
    if (!open || isEditing || requestedName.length < 2 || hasManualProfileData || enrich.isPending || lastAutomaticName.current === requestedName) return;
    const timeout = window.setTimeout(() => {
      lastAutomaticName.current = requestedName;
      autofill(requestedName, true);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [open, isEditing, form.name, form.category, form.aliases, form.description, form.imageUrl, enrich.isPending]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  return <Dialog open={open} onOpenChange={begin}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{isEditing ? "Edit preloaded Blast" : "Add preloaded Blast"}</DialogTitle><DialogDescription>Creates or updates the canonical Target; it does not fabricate activity.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">Name<div className="flex gap-2"><Input value={form.name} onChange={(e) => { set("name", e.target.value); if (!isEditing) set("slug", slugify(e.target.value)); }} data-testid="input-preloaded-name" /><Button type="button" variant="outline" onClick={() => autofill()} disabled={enrich.isPending || form.name.trim().length < 2} data-testid="button-autofill-preloaded">{enrich.isPending ? "Finding…" : "Auto-fill"}</Button></div></label>
      <label className="space-y-1 text-sm font-medium">Slug<Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} data-testid="input-preloaded-slug" /></label>
      <label className="space-y-1 text-sm font-medium">Type<Select value={form.type} onValueChange={(value) => set("type", value as FormState["type"])}><SelectTrigger data-testid="select-preloaded-type"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></label>
      <label className="space-y-1 text-sm font-medium">Category<Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. athlete" data-testid="input-preloaded-category" /></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2">Aliases <span className="font-normal text-muted-foreground">(one per line or comma-separated)</span><Textarea value={form.aliases} onChange={(e) => set("aliases", e.target.value)} data-testid="input-preloaded-aliases" /></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2">Description<Textarea value={form.description} onChange={(e) => set("description", e.target.value)} data-testid="input-preloaded-description" /></label>
      <TargetImageUpload value={form.imageUrl} onChange={(value) => set("imageUrl", value)} />
      <TargetBannerUpload value={form.bannerImageUrl} onChange={(value) => set("bannerImageUrl", value)} />
      <label className="space-y-1 text-sm font-medium">Status<Select value={form.status} onValueChange={(value) => set("status", value as FormState["status"])}><SelectTrigger data-testid="select-preloaded-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent></Select></label>
      <div className="flex items-end gap-5 pb-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="checkbox-preloaded-featured" /> Featured</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} data-testid="checkbox-preloaded-verified" /> Verified</label></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={() => begin(false)} data-testid="button-cancel-preloaded-form">Cancel</Button><Button onClick={save} disabled={pending} data-testid="button-save-preloaded">{pending ? "Saving…" : isEditing ? "Save changes" : "Create canonical Target"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function MetricsDialog({ target, open, onOpenChange }: { target: Target | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const metrics = useGetAdminPreloadedTargetMetrics(target?.id ?? "", { query: { queryKey: getGetAdminPreloadedTargetMetricsQueryKey(target?.id ?? ""), enabled: open && !!target } });
  const rows = metrics.data ? [["Blasts", metrics.data.blastCount], ["Comments", metrics.data.commentCount], ["Reactions", metrics.data.reactionCount], ["Views", metrics.data.viewCount], ["Shares", metrics.data.shareCount]] : [];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Real activity · {target?.name}</DialogTitle><DialogDescription>Activity is aggregated from the linked canonical Target.</DialogDescription></DialogHeader>
    {metrics.isLoading ? <Skeleton className="h-32 w-full" /> : metrics.isError ? <p className="text-sm text-destructive">{messageFor(metrics.error)}</p> : <div className="grid grid-cols-2 gap-3">{rows.map(([label, value]) => <div key={String(label)} className="rounded-sm border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-mono text-xl font-bold" data-testid={`metric-${String(label).toLowerCase()}-${target?.id}`}>{Number(value).toLocaleString()}</div></div>)}</div>}
  </DialogContent></Dialog>;
}

export default function PreloadedBlastsPage() {
  const queryClient = useQueryClient(); const { toast } = useToast(); const fileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1); const [q, setQ] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState<"all" | "active" | "disabled" | "archived">("all");
  const [formOpen, setFormOpen] = useState(false); const [adoptOpen, setAdoptOpen] = useState(false); const [editing, setEditing] = useState<Target | null>(null); const [metricsTarget, setMetricsTarget] = useState<Target | null>(null); const [csv, setCsv] = useState(""); const [importOpen, setImportOpen] = useState(false); const [preview, setPreview] = useState<Awaited<ReturnType<typeof import("@workspace/api-client-react").previewAdminPreloadedImport>> | null>(null);
  const params = { page, limit: 20, q: search || undefined, status };
  const list = useListAdminPreloadedTargets(params);
  const update = useUpdateAdminPreloadedTarget(); const previewImport = usePreviewAdminPreloadedImport(); const confirmImport = useConfirmAdminPreloadedImport();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminPreloadedTargetsQueryKey() });
  const mutate = (target: Target, data: { status?: "active" | "disabled"; featured?: boolean; verified?: boolean; archive?: boolean }, success: string, destructive = false) => {
    if (destructive && !window.confirm(`Archive ${target.name}? This removes it from active curated discovery but does not delete its underlying activity.`)) return;
    update.mutate({ id: target.id, data }, { onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: getGetAdminPreloadedTargetMetricsQueryKey(target.id) }); toast({ title: success }); }, onError: (error) => toast({ title: "Action failed", description: messageFor(error), variant: "destructive" }) });
  };
  const readFile = (file?: File) => { if (!file) return; if (!file.name.toLowerCase().endsWith(".csv")) { toast({ title: "CSV required", description: "Choose a .csv file.", variant: "destructive" }); return; } setPreview(null); const reader = new FileReader(); reader.onload = () => setCsv(String(reader.result ?? "")); reader.onerror = () => toast({ title: "Unable to read file", variant: "destructive" }); reader.readAsText(file); };
  const previewCsv = () => previewImport.mutate({ data: { csv } }, { onSuccess: setPreview, onError: (error) => toast({ title: "Preview failed", description: messageFor(error), variant: "destructive" }) });
  const confirmCsv = () => confirmImport.mutate({ data: { csv } }, { onSuccess: (result) => { invalidate(); toast({ title: "Import complete", description: `${result.createCount} canonical Targets created.` }); setPreview(null); setCsv(""); setImportOpen(false); }, onError: (error) => toast({ title: "Import failed", description: messageFor(error), variant: "destructive" }) });
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-primary">Canonical discovery</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Preloaded Blasts</h1><p className="mt-1 text-sm text-muted-foreground">Manage curated Targets and their linked canonical conversations.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setImportOpen(true)} data-testid="button-import-preloaded"><Upload className="mr-2 h-4 w-4" />Import CSV</Button><Button variant="outline" onClick={() => setAdoptOpen(true)} data-testid="button-adopt-preloaded"><CheckCircle2 className="mr-2 h-4 w-4" />Adopt Target</Button><Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="button-add-preloaded"><Plus className="mr-2 h-4 w-4" />Add subject</Button></div></div>
    <Card className="rounded-sm"><CardHeader className="gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="font-mono text-sm uppercase tracking-wider">Curated subjects {list.data ? `(${list.data.total})` : ""}</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><div className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setSearch(q.trim()); setPage(1); } }} placeholder="Search name or alias" data-testid="input-search-preloaded" /><Button variant="outline" size="icon" onClick={() => { setSearch(q.trim()); setPage(1); }} data-testid="button-search-preloaded"><Search className="h-4 w-4" /></Button></div><Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}><SelectTrigger className="w-full sm:w-36" data-testid="select-filter-preloaded-status"><SelectValue /></SelectTrigger><SelectContent>{["all", "active", "disabled", "archived"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></CardHeader>
      <CardContent className="overflow-x-auto p-0">{list.isLoading ? <div className="space-y-3 p-6">{[1,2,3].map((n) => <Skeleton key={n} className="h-14 w-full" />)}</div> : list.isError ? <AdminErrorState error={list.error} /> : <Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Signals</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{!list.data?.items.length ? <TableRow><TableCell colSpan={5} className="h-32 text-center font-mono text-sm text-muted-foreground">NO_PRELOADED_BLASTS_FOUND</TableCell></TableRow> : list.data.items.map((target) => <TableRow key={target.id} data-testid={`row-preloaded-${target.id}`}><TableCell><div className="flex items-center gap-3">{target.imageUrl ? <img src={target.imageUrl} alt="" className="h-9 w-9 rounded-sm object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-muted font-bold">{target.name.slice(0,1)}</div>}<div><div className="font-medium">{target.name}</div><a href={`/targets/${target.slug}`} className="font-mono text-xs text-primary hover:underline" data-testid={`link-canonical-${target.id}`}>/targets/{target.slug}</a></div></div></TableCell><TableCell><Badge variant="outline">{target.preloadCategory || target.type}</Badge></TableCell><TableCell><div className="flex flex-wrap gap-1"><Badge variant={target.preloadStatus === "active" ? "outline" : "secondary"}>{target.preloadStatus ?? "active"}</Badge>{target.featured && <Badge>Featured</Badge>}{target.verified && <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />Verified</Badge>}</div></TableCell><TableCell><button className="font-mono text-sm hover:text-primary hover:underline" onClick={() => setMetricsTarget(target)} data-testid={`button-metrics-${target.id}`}>{target.blastCount.toLocaleString()} blasts</button></TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={update.isPending} data-testid={`button-actions-preloaded-${target.id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditing(target); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => setMetricsTarget(target)}><Eye className="mr-2 h-4 w-4" />View activity</DropdownMenuItem><DropdownMenuItem onClick={() => mutate(target, { status: target.preloadStatus === "disabled" ? "active" : "disabled" }, target.preloadStatus === "disabled" ? "Subject re-enabled" : "Subject disabled")} >{target.preloadStatus === "disabled" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}{target.preloadStatus === "disabled" ? "Re-enable" : "Disable"}</DropdownMenuItem><DropdownMenuItem onClick={() => mutate(target, { featured: !target.featured }, target.featured ? "Subject unfeatured" : "Subject featured")}><Star className="mr-2 h-4 w-4" />{target.featured ? "Unfeature" : "Feature"}</DropdownMenuItem><DropdownMenuItem onClick={() => mutate(target, { verified: !target.verified }, target.verified ? "Subject unverified" : "Subject verified")}><CheckCircle2 className="mr-2 h-4 w-4" />{target.verified ? "Unverify" : "Verify"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => mutate(target, { archive: true }, "Subject archived", true)}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody></Table>}</CardContent>
    </Card>
    {list.data && <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {list.data.page} · {list.data.total.toLocaleString()} subjects</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} data-testid="button-preloaded-prev">Previous</Button><Button variant="outline" disabled={!list.data.hasMore} onClick={() => setPage((value) => value + 1)} data-testid="button-preloaded-next">Next</Button></div></div>}
    <TargetFormDialog key={formOpen ? editing?.id ?? "new" : "closed"} target={editing} open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }} /><AdoptionDialog open={adoptOpen} onOpenChange={setAdoptOpen} /><MetricsDialog target={metricsTarget} open={!!metricsTarget} onOpenChange={(open) => !open && setMetricsTarget(null)} />
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Import preloaded Blasts</DialogTitle><DialogDescription>Preview is a dry run: nothing is created until you explicitly confirm.</DialogDescription></DialogHeader><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} data-testid="input-preloaded-csv-file" /><div className="flex items-center justify-between"><span className="text-sm font-medium">CSV text</span><Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} data-testid="button-choose-preloaded-csv"><FileUp className="mr-2 h-4 w-4" />Choose CSV</Button></div><Textarea className="min-h-44 font-mono text-xs" value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} placeholder={"name,type,aliases,slug,status\nExample Person,person,\"Example Alias\",example-person,active"} data-testid="textarea-preloaded-csv" />
      {preview && <div className="space-y-3 rounded-sm border p-4"><div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">{[["New",preview.createCount],["Existing — adopt",preview.existingCount],["Duplicates",preview.duplicateCount],["Invalid",preview.invalidCount],["Total",preview.total]].map(([label, value]) => <div key={String(label)}><div className="text-muted-foreground">{label}</div><strong>{value}</strong></div>)}</div>{preview.existingCount > 0 && <p className="rounded-sm bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400" data-testid="text-import-adoption-required">Existing/review rows will not be created or modified by this import. Use “Adopt Target” to review and adopt an existing public Target in place.</p>}{preview.rows.filter((row) => row.status !== "create").length > 0 && <div className="max-h-36 overflow-auto border-t pt-2 text-xs">{preview.rows.filter((row) => row.status !== "create").map((row) => <p key={row.line} className={`py-1 ${row.status === "existing" ? "text-amber-700 dark:text-amber-400" : "text-destructive"}`}>Line {row.line}: {row.status === "existing" ? "Requires adoption" : row.status} {row.message ? `— ${row.message}` : ""}</p>)}</div>}</div>}
      <DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)} data-testid="button-cancel-preloaded-import">Cancel</Button><Button variant="outline" onClick={previewCsv} disabled={!csv.trim() || previewImport.isPending} data-testid="button-preview-preloaded-import">{previewImport.isPending ? "Previewing…" : "Preview import"}</Button><Button onClick={confirmCsv} disabled={!preview || preview.createCount === 0 || confirmImport.isPending} data-testid="button-confirm-preloaded-import">{confirmImport.isPending ? "Creating…" : `Create ${preview?.createCount ?? 0} subjects`}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}