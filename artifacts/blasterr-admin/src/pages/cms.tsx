import { useEffect, useMemo, useState } from "react";
import { FileText, Image, Plus, Save, Settings2, Trash2, RefreshCw, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type CmsEntry = {
  id: string; type: string; slug: string; title: string; excerpt: string; body: Record<string, unknown>;
  seoTitle: string; seoDescription: string; featuredImage: string; status: string; publishAt: string | null;
  updatedAt: string;
};
type CmsMedia = { id: string; originalName: string; contentType: string; sizeBytes: number; lifecycleStatus: string; resourceType: string | null; resourceId: string | null; url: string; createdAt: string };
const types = ["homepage", "blog", "service", "portfolio", "team", "testimonial", "faq", "contact", "page"];
const statuses = ["draft", "scheduled", "published", "archived"];
const blank = (): Partial<CmsEntry> => ({ type: "page", title: "", slug: "", excerpt: "", body: {}, seoTitle: "", seoDescription: "", featuredImage: "", status: "draft", publishAt: null });

async function cmsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cms${path}`, { credentials: "include", headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "CMS request failed");
  return response.status === 204 ? undefined as T : response.json();
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function humanBytes(value: number) { return value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }

export default function CmsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"content" | "media" | "settings">("content");
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  const [media, setMedia] = useState<CmsMedia[]>([]);
  const [selected, setSelected] = useState<Partial<CmsEntry> | null>(null);
  const [bodyJson, setBodyJson] = useState("{}");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ siteName: "", tagline: "", seoTitle: "", seoDescription: "", contactEmail: "", socialLinks: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [content, assets, savedSettings] = await Promise.all([
        cmsFetch<CmsEntry[]>("/admin/entries"),
        cmsFetch<CmsMedia[]>("/admin/media"),
        cmsFetch<Record<string, Record<string, unknown>>>("/admin/settings"),
      ]);
      setEntries(content); setMedia(assets);
      const site = savedSettings.site ?? {};
      setSettings({
        siteName: String(site.siteName ?? ""), tagline: String(site.tagline ?? ""), seoTitle: String(site.seoTitle ?? ""),
        seoDescription: String(site.seoDescription ?? ""), contactEmail: String(site.contactEmail ?? ""), socialLinks: String(site.socialLinks ?? ""),
      });
    } catch (error) { toast({ title: "CMS unavailable", description: (error as Error).message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const visibleEntries = useMemo(() => filter === "all" ? entries : entries.filter((entry) => entry.type === filter), [entries, filter]);
  const update = (field: string, value: unknown) => setSelected((current) => current ? { ...current, [field]: value } : current);
  const selectEntry = (entry: Partial<CmsEntry>) => {
    setSelected(entry);
    setBodyJson(JSON.stringify(entry.body ?? {}, null, 2));
  };
  const saveEntry = async () => {
    if (!selected?.title?.trim()) { toast({ title: "Title required", description: "Give this piece of content a title.", variant: "destructive" }); return; }
    let body: Record<string, unknown>;
    try { body = JSON.parse(bodyJson); }
    catch { toast({ title: "Invalid structured content", description: "Fix the JSON before saving.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { ...selected, body };
      const saved = selected.id
        ? await cmsFetch<CmsEntry>(`/admin/entries/${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await cmsFetch<CmsEntry>("/admin/entries", { method: "POST", body: JSON.stringify(payload) });
      setEntries((current) => selected.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      selectEntry(saved); toast({ title: "Content saved", description: `${saved.title} is ${saved.status}.` });
    } catch (error) { toast({ title: "Could not save", description: (error as Error).message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  const archiveEntry = async (id: string) => {
    try { await cmsFetch(`/admin/entries/${id}`, { method: "DELETE" }); setEntries((current) => current.map((item) => item.id === id ? { ...item, status: "archived" } : item)); if (selected?.id === id) setSelected(null); toast({ title: "Entry archived" }); }
    catch (error) { toast({ title: "Could not archive", description: (error as Error).message, variant: "destructive" }); }
  };
  const saveSettings = async () => {
    try {
      const result = await cmsFetch<Record<string, Record<string, unknown>>>("/admin/settings", { method: "PATCH", body: JSON.stringify({ site: settings }) });
      setSettings((current) => ({ ...current, ...Object.fromEntries(Object.entries(result.site ?? {}).map(([key, value]) => [key, String(value)])) })); toast({ title: "Website settings saved" });
    } catch (error) { toast({ title: "Could not save settings", description: (error as Error).message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-3"><Globe2 className="h-7 w-7 text-primary" /><h1 className="font-mono text-3xl font-bold uppercase tracking-tight">Website CMS</h1></div><p className="mt-1 text-sm text-muted-foreground">Publish the public website without touching the social product.</p></div>
        <Button variant="outline" size="sm" className="rounded-sm font-mono" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      <div className="flex gap-1 border-b">
        {([["content", FileText, "Content"], ["media", Image, "Media library"], ["settings", Settings2, "Website settings"]] as const).map(([key, Icon, label]) => <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>
      {tab === "content" && <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <Card className="rounded-sm shadow-none"><CardHeader className="flex-row items-center justify-between border-b px-5 py-4"><div><CardTitle className="font-mono text-sm uppercase">Content entries</CardTitle><CardDescription>Draft, schedule, publish, archive, and restore your website content.</CardDescription></div><Button size="sm" className="rounded-sm" onClick={() => selectEntry(blank())}><Plus className="mr-2 h-4 w-4" />New entry</Button></CardHeader><CardContent className="p-0">
          <div className="flex gap-2 overflow-x-auto border-b px-5 py-3">{["all", ...types].map((value) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-mono uppercase ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{value}</button>)}</div>
          {loading ? <p className="p-8 text-sm text-muted-foreground">Loading content…</p> : visibleEntries.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No entries yet. Create the first page from the editor.</div> : <div className="divide-y">{visibleEntries.map((entry) => <button key={entry.id} onClick={() => selectEntry(entry)} className={`flex w-full items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/50 ${selected?.id === entry.id ? "bg-primary/5" : ""}`}><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="outline">{entry.type}</Badge><Badge variant={entry.status === "published" ? "success" : entry.status === "archived" ? "secondary" : "outline"}>{entry.status}</Badge></div><p className="truncate font-semibold">{entry.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">/{entry.slug} · updated {formatDate(entry.updatedAt)}</p></div><span className="text-xs text-muted-foreground">Edit</span></button>)}</div>}
        </CardContent></Card>
        <Card className="rounded-sm shadow-none"><CardHeader className="border-b px-5 py-4"><CardTitle className="font-mono text-sm uppercase">{selected ? selected.id ? "Edit entry" : "New entry" : "Select content"}</CardTitle><CardDescription>{selected ? "Changes are validated and sanitized by the API." : "Choose an entry or create one to begin."}</CardDescription></CardHeader>{selected && <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Content type<select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={selected.type} onChange={(e) => update("type", e.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label className="space-y-2 text-sm font-medium">Status<select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={selected.status} onChange={(e) => update("status", e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <label className="block space-y-2 text-sm font-medium">Title<Input value={selected.title ?? ""} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Welcome to BLASTERR" /></label>
          <label className="block space-y-2 text-sm font-medium">Slug<Input value={selected.slug ?? ""} onChange={(e) => update("slug", e.target.value)} placeholder="welcome-to-blasterr" /></label>
          <label className="block space-y-2 text-sm font-medium">Excerpt<Textarea value={selected.excerpt ?? ""} onChange={(e) => update("excerpt", e.target.value)} placeholder="Short summary for cards and search results." /></label>
          <label className="block space-y-2 text-sm font-medium">Structured content (JSON)<Textarea className="min-h-28 font-mono text-xs" value={bodyJson} onChange={(e) => setBodyJson(e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">SEO title<Input value={selected.seoTitle ?? ""} onChange={(e) => update("seoTitle", e.target.value)} /></label><label className="space-y-2 text-sm font-medium">Publish at<input type="datetime-local" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={selected.publishAt?.slice(0, 16) ?? ""} onChange={(e) => update("publishAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /></label></div>
          <label className="block space-y-2 text-sm font-medium">SEO description<Textarea value={selected.seoDescription ?? ""} onChange={(e) => update("seoDescription", e.target.value)} /></label>
          <label className="block space-y-2 text-sm font-medium">Featured image URL<Input value={selected.featuredImage ?? ""} onChange={(e) => update("featuredImage", e.target.value)} placeholder="https://…" /></label>
          <div className="flex justify-between gap-2 border-t pt-4"><Button variant="outline" className="rounded-sm text-destructive" onClick={() => selected.id && void archiveEntry(selected.id)} disabled={!selected.id}><Trash2 className="mr-2 h-4 w-4" />Archive</Button><Button className="rounded-sm" onClick={() => void saveEntry()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save entry"}</Button></div>
        </CardContent>}</Card>
      </div>}
      {tab === "media" && <Card className="rounded-sm shadow-none"><CardHeader className="border-b px-5 py-4"><CardTitle className="font-mono text-sm uppercase">Media library</CardTitle><CardDescription>R2-backed uploads available to the website and social product.</CardDescription></CardHeader><CardContent className="p-0">{media.length === 0 ? <p className="p-8 text-sm text-muted-foreground">No media assets have been uploaded.</p> : <div className="divide-y">{media.map((asset) => <div key={asset.id} className="flex items-center justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-3">{asset.contentType.startsWith("image/") ? <img src={asset.url} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-muted"><FileText className="h-4 w-4" /></div>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{asset.originalName}</p><p className="text-xs text-muted-foreground">{asset.contentType} · {humanBytes(asset.sizeBytes)} · {asset.lifecycleStatus}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{asset.resourceType === "cms" ? "CMS" : "Available"}</Badge>{asset.contentType.startsWith("image/") && <Button size="sm" variant="outline" disabled={!selected} onClick={() => { if (selected) { update("featuredImage", asset.url); setTab("content"); } }}>Use image</Button>}</div></div>)}</div>}</CardContent></Card>}
      {tab === "settings" && <Card className="max-w-3xl rounded-sm shadow-none"><CardHeader className="border-b px-5 py-4"><CardTitle className="font-mono text-sm uppercase">Website settings</CardTitle><CardDescription>Global identity, contact, social, and search metadata for the public website.</CardDescription></CardHeader><CardContent className="space-y-5 p-5"><label className="block space-y-2 text-sm font-medium">Site name<Input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Tagline<Input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Default SEO title<Input value={settings.seoTitle} onChange={(e) => setSettings({ ...settings, seoTitle: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Default SEO description<Textarea value={settings.seoDescription} onChange={(e) => setSettings({ ...settings, seoDescription: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Contact email<Input type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium">Social links<Textarea className="font-mono text-xs" value={settings.socialLinks} onChange={(e) => setSettings({ ...settings, socialLinks: e.target.value })} placeholder="One URL per line" /></label><div className="flex justify-end border-t pt-4"><Button className="rounded-sm" onClick={() => void saveSettings()}><Save className="mr-2 h-4 w-4" />Save website settings</Button></div></CardContent></Card>}
    </div>
  );
}