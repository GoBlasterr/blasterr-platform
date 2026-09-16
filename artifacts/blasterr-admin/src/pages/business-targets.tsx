import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminBusinessesQueryKey,
  useListAdminBusinesses,
  useCreateAdminBusiness,
  useUpdateAdminBusiness,
  AdminBusinessInput,
  AdminBusinessUpdate,
  type BusinessSummary,
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
import { Archive, Lock, CheckCircle2, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Star, Upload } from "lucide-react";

type FormState = AdminBusinessInput & { id?: string; status: "active" | "hidden" | "locked" };
const blankForm = (): FormState => ({
  name: "", location: "", category: "", subcategory: "", description: "", city: "", state: "", postalCode: "", address: "", phone: "", website: "", email: "", imageUrl: "", bannerImageUrl: "", featured: false, verified: false, status: "active"
});

const messageFor = (error: unknown) => error instanceof Error ? error.message : "The request could not be completed. Please try again.";

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
  const uploaded = await fetch(`/api/storage/uploads/${details.assetId}/content`, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
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
      toast({ title: "Banner uploaded", description: "Save the business to publish this banner." });
    } catch (error) {
      toast({ title: "Banner upload failed", description: messageFor(error), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="space-y-2 sm:col-span-2">
    <div className="text-sm font-medium">Banner image</div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void choose(event.target.files?.[0])} data-testid="input-business-banner-upload" />
    {value ? <div className="aspect-[3/1] w-full overflow-hidden rounded-sm border bg-muted/30"><img src={value} alt="Banner preview" className="h-full w-full object-cover object-[center_25%]" /></div> : <div className="flex aspect-[3/1] w-full items-center justify-center rounded-sm border bg-muted text-xs text-muted-foreground">No banner</div>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} data-testid="button-upload-business-banner"><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload banner"}</Button>
      {value && <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={uploading}>Remove</Button>}
    </div>
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
      toast({ title: "Profile image uploaded", description: "Save the business to publish this image." });
    } catch (error) {
      toast({ title: "Image upload failed", description: messageFor(error), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return <div className="space-y-2 sm:col-span-2">
    <div className="text-sm font-medium">Profile image</div>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void choose(event.target.files?.[0])} data-testid="input-business-image-upload" />
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      {value ? <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted/30 p-1"><img src={value} alt="Full profile preview" className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-sm border bg-muted text-xs text-muted-foreground">No image</div>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} data-testid="button-upload-business-image"><Upload className="mr-2 h-4 w-4" />{uploading ? "Uploading…" : "Upload image"}</Button>
        {value && <Button type="button" variant="ghost" onClick={() => onChange("")} disabled={uploading}>Remove</Button>}
      </div>
    </div>
  </div>;
}

function BusinessFormDialog({ target, open, onOpenChange }: { target: BusinessSummary | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(blankForm);
  const create = useCreateAdminBusiness();
  const update = useUpdateAdminBusiness();
  
  const isEditing = !!target;
  const pending = create.isPending || update.isPending;
  
  useEffect(() => {
    if (!open) return;
    setForm(target ? { 
      id: target.id, 
      name: target.name, 
      location: target.location, 
      category: target.category || "", 
      subcategory: (target as any).subcategory || "", 
      description: target.description || "", 
      city: (target as any).city || "", 
      state: (target as any).state || "", 
      postalCode: (target as any).postalCode || "", 
      address: (target as any).address || "", 
      phone: (target as any).phone || "", 
      website: (target as any).website || "", 
      email: (target as any).email || "", 
      imageUrl: target.imageUrl || "", 
      bannerImageUrl: target.bannerImageUrl || "", 
      status: (target as any).status || "active", 
      featured: !!target.featured, 
      verified: !!target.verified 
    } : blankForm());
  }, [open, target?.id]);
  
  const save = () => {
    const data: AdminBusinessUpdate = { 
      name: form.name.trim(), 
      location: form.location.trim(), 
      category: form.category?.trim() || undefined, 
      subcategory: form.subcategory?.trim() || undefined, 
      description: form.description?.trim() || undefined, 
      city: form.city?.trim() || undefined, 
      state: form.state?.trim() || undefined, 
      postalCode: form.postalCode?.trim() || undefined, 
      address: form.address?.trim() || undefined, 
      phone: form.phone?.trim() || undefined, 
      website: form.website?.trim() || undefined, 
      email: form.email?.trim() || undefined, 
      imageUrl: form.imageUrl?.trim() || undefined, 
      bannerImageUrl: form.bannerImageUrl?.trim() || undefined, 
      status: form.status as "active" | "hidden" | "locked", 
      featured: form.featured, 
      verified: form.verified 
    };
    
    if (!data.name || !data.location) {
      toast({ title: "Required fields missing", description: "Name and location are required.", variant: "destructive" }); return;
    }
    
    const callbacks = { 
      onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey() }); 
        toast({ title: isEditing ? "Business updated" : "Business created" }); 
        onOpenChange(false); 
      }, 
      onError: (error: unknown) => toast({ title: "Unable to save business", description: messageFor(error), variant: "destructive" }) 
    };
    
    if (target) {
      update.mutate({ targetId: target.id, data }, callbacks); 
    } else {
      create.mutate({ data: data as AdminBusinessInput }, callbacks);
    }
  };
  
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
    <DialogHeader><DialogTitle>{isEditing ? "Edit Business Target" : "Add Business Target"}</DialogTitle><DialogDescription>Creates or updates a real business identity.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">Name <span className="text-destructive">*</span><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="input-business-name" /></label>
      <label className="space-y-1 text-sm font-medium">Location string <span className="text-destructive">*</span><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. San Francisco, CA" data-testid="input-business-location" /></label>
      
      <label className="space-y-1 text-sm font-medium">Category<Input value={form.category || ""} onChange={(e) => set("category", e.target.value)} data-testid="input-business-category" /></label>
      <label className="space-y-1 text-sm font-medium">Subcategory<Input value={form.subcategory || ""} onChange={(e) => set("subcategory", e.target.value)} data-testid="input-business-subcategory" /></label>
      
      <label className="space-y-1 text-sm font-medium sm:col-span-2">Description<Textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} data-testid="input-business-description" /></label>
      
      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
         <label className="space-y-1 text-sm font-medium">Address<Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} data-testid="input-business-address" /></label>
         <label className="space-y-1 text-sm font-medium">City<Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} data-testid="input-business-city" /></label>
         <label className="space-y-1 text-sm font-medium">State/Province<Input value={form.state || ""} onChange={(e) => set("state", e.target.value)} data-testid="input-business-state" /></label>
         <label className="space-y-1 text-sm font-medium">Postal Code<Input value={form.postalCode || ""} onChange={(e) => set("postalCode", e.target.value)} data-testid="input-business-postalCode" /></label>
      </div>

      <label className="space-y-1 text-sm font-medium">Phone<Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} data-testid="input-business-phone" /></label>
      <label className="space-y-1 text-sm font-medium">Email<Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} data-testid="input-business-email" /></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2">Website URL<Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} data-testid="input-business-website" /></label>

      <TargetImageUpload value={form.imageUrl || ""} onChange={(value) => set("imageUrl", value)} />
      <TargetBannerUpload value={form.bannerImageUrl || ""} onChange={(value) => set("bannerImageUrl", value)} />
      
      {isEditing && <label className="space-y-1 text-sm font-medium">Status<Select value={form.status} onValueChange={(value) => set("status", value as FormState["status"])}><SelectTrigger data-testid="select-business-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="hidden">Hidden</SelectItem><SelectItem value="locked">Locked</SelectItem></SelectContent></Select></label>}
      <div className="flex items-end gap-5 pb-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} data-testid="checkbox-business-featured" /> Featured</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} data-testid="checkbox-business-verified" /> Verified</label>
      </div>
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-business-form">Cancel</Button><Button onClick={save} disabled={pending} data-testid="button-save-business">{pending ? "Saving…" : isEditing ? "Save changes" : "Create Business"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

export default function BusinessTargetsPage() {
  const queryClient = useQueryClient(); 
  const { toast } = useToast();
  
  const [page, setPage] = useState(1); 
  const [q, setQ] = useState(""); 
  const [search, setSearch] = useState(""); 
  const [status, setStatus] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false); 
  const [editing, setEditing] = useState<BusinessSummary | null>(null); 
  
  const params = { page, limit: 20, q: search || undefined, status: status === "all" ? undefined : status };
  const list = useListAdminBusinesses(params);
  const update = useUpdateAdminBusiness(); 
  
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey() });
  
  const mutate = (target: BusinessSummary, data: AdminBusinessUpdate, success: string, destructive = false) => {
    if (destructive && !window.confirm(`Are you sure you want to perform this sensitive action on ${target.name}?`)) return;
    update.mutate({ targetId: target.id, data }, { 
      onSuccess: () => { invalidate(); toast({ title: success }); }, 
      onError: (error) => toast({ title: "Action failed", description: messageFor(error), variant: "destructive" }) 
    });
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-primary">Identity Operations</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Business Targets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage real business entities and location identity.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="button-add-business"><Plus className="mr-2 h-4 w-4" />Add Business</Button>
      </div>
    </div>
    
    <Card className="rounded-sm">
      <CardHeader className="gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-mono text-sm uppercase tracking-wider">Directory {list.data ? `(${list.data.total})` : ""}</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setSearch(q.trim()); setPage(1); } }} placeholder="Search name or location" data-testid="input-search-business" />
            <Button variant="outline" size="icon" onClick={() => { setSearch(q.trim()); setPage(1); }} data-testid="button-search-business"><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-filter-business-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "active", "hidden", "locked"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {list.isLoading ? <div className="p-6"><Skeleton className="h-64 w-full" /></div> : list.isError ? <AdminErrorState error={list.error} /> : 
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px] font-mono text-xs uppercase">Business</TableHead>
              <TableHead className="font-mono text-xs uppercase">Location & Category</TableHead>
              <TableHead className="font-mono text-xs uppercase">Metrics</TableHead>
              <TableHead className="font-mono text-xs uppercase">Badges</TableHead>
              <TableHead className="w-[80px] font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data?.items.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center font-mono text-sm text-muted-foreground">NO_BUSINESSES_FOUND</TableCell></TableRow> : 
            list.data?.items.map((target) => {
              const statusVal = (target as any).status || "active";
              return <TableRow key={target.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {target.imageUrl ? <img src={target.imageUrl} alt={target.name} className="h-8 w-8 rounded-sm object-cover bg-muted" /> : <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted text-xs font-bold text-muted-foreground">{target.name.charAt(0).toUpperCase()}</div>}
                    <div>
                      <div className="font-medium text-sm">{target.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]" title={target.slug}>/{target.slug}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">{target.location}</div>
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{target.category || "uncategorized"}</div>
                </TableCell>
                <TableCell>
                  <div className="grid grid-cols-2 gap-1 gap-x-3 text-[10px] font-mono whitespace-nowrap">
                    <div><span className="text-muted-foreground mr-1">FL:</span>{target.followerCount.toLocaleString()}</div>
                    <div><span className="text-muted-foreground mr-1">BL:</span>{target.blastCount.toLocaleString()}</div>
                    <div><span className="text-muted-foreground mr-1">VW:</span>{target.viewCount.toLocaleString()}</div>
                    <div><span className="text-muted-foreground mr-1">CM:</span>{target.commentCount.toLocaleString()}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {statusVal === "hidden" && <Badge variant="secondary" className="text-[9px] uppercase"><EyeOff className="h-3 w-3 mr-1" />Hidden</Badge>}
                    {statusVal === "locked" && <Badge variant="destructive" className="text-[9px] uppercase"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                    {target.verified && <Badge variant="outline" className="text-[9px] uppercase text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                    {target.featured && <Badge variant="outline" className="text-[9px] uppercase text-amber-500 border-amber-500/30"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(target); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit details</DropdownMenuItem>
                      <DropdownMenuItem asChild><a href={`/${target.slug}`} target="_blank" rel="noopener noreferrer" className="cursor-pointer"><Eye className="mr-2 h-4 w-4" />View public profile</a></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {target.featured ? <DropdownMenuItem onClick={() => mutate(target, { featured: false } as any, "Removed featured badge")}><Star className="mr-2 h-4 w-4 opacity-50" />Unfeature</DropdownMenuItem> : <DropdownMenuItem onClick={() => mutate(target, { featured: true } as any, "Marked as featured")}><Star className="mr-2 h-4 w-4 text-amber-500" />Feature</DropdownMenuItem>}
                      {target.verified ? <DropdownMenuItem onClick={() => mutate(target, { verified: false } as any, "Removed verified badge")}><CheckCircle2 className="mr-2 h-4 w-4 opacity-50" />Unverify</DropdownMenuItem> : <DropdownMenuItem onClick={() => mutate(target, { verified: true } as any, "Marked as verified")}><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Verify</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      {statusVal === "hidden" ? <DropdownMenuItem onClick={() => mutate(target, { status: "active" } as any, "Business is now visible")}><Eye className="mr-2 h-4 w-4" />Unhide</DropdownMenuItem> : <DropdownMenuItem onClick={() => mutate(target, { status: "hidden" } as any, "Business hidden from search")} className="text-destructive"><EyeOff className="mr-2 h-4 w-4" />Hide</DropdownMenuItem>}
                      {statusVal === "locked" ? <DropdownMenuItem onClick={() => mutate(target, { status: "active" } as any, "Business unlocked")}><Lock className="mr-2 h-4 w-4 opacity-50" />Unlock</DropdownMenuItem> : <DropdownMenuItem onClick={() => mutate(target, { status: "locked" } as any, "Business locked", true)} className="text-destructive"><Lock className="mr-2 h-4 w-4" />Lock profile</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>}
      </CardContent>
      
      {list.data && list.data.total > list.data.limit && (
        <div className="flex items-center justify-between border-t p-4">
          <p className="font-mono text-xs text-muted-foreground">Showing {(page - 1) * list.data.limit + 1} to {Math.min(page * list.data.limit, list.data.total)} of {list.data.total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="font-mono text-xs uppercase">Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!list.data.hasMore} className="font-mono text-xs uppercase">Next</Button>
          </div>
        </div>
      )}
    </Card>
    
    <BusinessFormDialog open={formOpen} onOpenChange={setFormOpen} target={editing} />
  </div>;
}
