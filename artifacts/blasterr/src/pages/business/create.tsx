import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Briefcase, Camera, ImagePlus } from "lucide-react";
import { BusinessProfileInputCategory, getListOwnedBusinessesQueryKey, useCreateBusinessProfile, useListOwnedBusinesses } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

const categories = Object.values(BusinessProfileInputCategory);

export default function CreateBusinessProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: ownedBusinesses } = useListOwnedBusinesses({
    query: {
      enabled: !!currentUser,
      queryKey: [...getListOwnedBusinessesQueryKey(), currentUser?.id ?? "guest"],
    },
  });
  const createBusiness = useCreateBusinessProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    location: "",
    category: BusinessProfileInputCategory.Services,
    description: "",
    website: "",
    email: "",
    phone: "",
  });

  const chooseImage = (file: File | undefined, purpose: "avatar" | "banner") => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast({ title: "Choose a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Images must be 10 MB or smaller.", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    if (purpose === "avatar") {
      setAvatarFile(file);
      setAvatarPreview(preview);
    } else {
      setBannerFile(file);
      setBannerPreview(preview);
    }
  };

  const uploadImage = async (file: File, purpose: "target-image" | "banner") => {
    const request = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, purpose }),
    });
    const details = await request.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
    if (!request.ok || !details.uploadURL || !details.objectPath || !details.assetId) {
      throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
    }
    const upload = await fetch(`/api/storage/uploads/${details.assetId}/content`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": file.type }, body: file,
    });
    if (!upload.ok) throw new Error(`Could not upload the ${purpose} image.`);
    const completed = await fetch(`/api/storage/uploads/${details.assetId}/complete`, {
      method: "POST", credentials: "include",
    });
    const completedDetails = await completed.json() as { objectPath?: string; status?: string; error?: string };
    if (!completed.ok || completedDetails.status !== "ready" || !completedDetails.objectPath) {
      throw new Error(completedDetails.error || `Could not verify the ${purpose} image.`);
    }
    return `/api/storage${completedDetails.objectPath}`;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const [imageUrl, bannerImageUrl] = await Promise.all([
        avatarFile ? uploadImage(avatarFile, "target-image") : Promise.resolve(undefined),
        bannerFile ? uploadImage(bannerFile, "banner") : Promise.resolve(undefined),
      ]);
      const business = await createBusiness.mutateAsync({
        data: { ...form, ...(imageUrl ? { imageUrl } : {}), ...(bannerImageUrl ? { bannerImageUrl } : {}) },
      });
          queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() });
      setLocation(`/business/${business.id}/center`);
    } catch (error) {
      const message = (error as any)?.data?.error || (error as Error).message || "Business profile could not be created.";
      toast({ title: "Unable to create business profile", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 px-4 py-3 glass-panel">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Create a Business Target</h1>
          <p className="text-xs text-muted-foreground">Your personal profile will own this business page.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Briefcase className="mb-3 h-7 w-7 text-primary" />
          <h2 className="font-display text-xl font-bold text-white">Build your business presence</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This creates a separate public Business Target page. You can manage it through Business Center without changing your personal profile.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-card/70 p-5 md:p-7">
          <Field label="Business name">
            <Input required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your business name" />
          </Field>
          <Field label="City or location">
            <Input required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Charlotte, NC" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(category) => setForm({ ...form, category: category as typeof form.category })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="About the business">
            <Textarea required maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell people what your business does." className="min-h-28" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Website (optional)"><Input maxLength={500} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" /></Field>
            <Field label="Business email (optional)"><Input type="email" maxLength={320} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@example.com" /></Field>
          </div>
          <Field label="Phone (optional)"><Input maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Business phone number" /></Field>
          <div className="space-y-5 border-t border-white/10 pt-5">
            <ImagePicker label="Business banner" preview={bannerPreview} file={bannerFile} inputRef={bannerInputRef} onPick={(file) => chooseImage(file, "banner")} icon={<ImagePlus className="h-4 w-4" />} />
            <ImagePicker label="Business logo" preview={avatarPreview} file={avatarFile} inputRef={avatarInputRef} onPick={(file) => chooseImage(file, "avatar")} icon={<Camera className="h-4 w-4" />} square />
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF images up to 10 MB.</p>
          </div>
          <Button type="submit" disabled={createBusiness.isPending || ownedBusinesses?.canCreate === false} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">
            {ownedBusinesses?.canCreate === false ? "5 Page Limit Reached" : createBusiness.isPending ? "Creating business page…" : "Create Business Target"}
          </Button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-white">{label}</span>{children}</label>;
}

function ImagePicker({ label, preview, file, inputRef, onPick, icon, square = false }: {
  label: string; preview: string; file: File | null; inputRef: RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void; icon: ReactNode; square?: boolean;
}) {
  return <div className="space-y-2">
    <span className="text-sm font-semibold text-white">{label}</span>
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/20 ${square ? "h-28 w-28" : "h-32 w-full"}`}>
      {preview ? <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image selected</div>}
    </div>
    <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="rounded-full border-white/20">
      {icon} <span className="ml-2">{file ? "Change file" : "Select file"}</span>
    </Button>
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => onPick(event.target.files?.[0])} />
    {file && <p className="max-w-full truncate text-xs text-primary">Selected: {file.name}</p>}
  </div>;
}