import { useEffect, useState } from "react";
import { useRoute } from "wouter";

type CmsEntry = { id: string; type: string; slug: string; title: string; excerpt: string; featuredImage: string; body: Record<string, unknown> };

export default function CmsCollectionPage() {
  const [, params] = useRoute("/site/:type");
  const type = params?.type ?? "page";
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  useEffect(() => {
    let active = true;
    const load = () => void fetch(`/api/cms/public/entries?type=${encodeURIComponent(type)}`).then((response) => response.ok ? response.json() : []).then((data) => { if (active) setEntries(data); });
    load();
    const events = new EventSource("/api/cms/events", { withCredentials: true });
    events.addEventListener("cms.updated", load);
    return () => { active = false; events.close(); };
  }, [type]);
  return <div className="min-h-screen p-5 md:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">BLASTERR website</p><h1 className="mt-2 font-display text-4xl font-bold capitalize text-white">{type.replace("-", " ")}</h1><div className="mt-8 grid gap-5">{entries.length ? entries.map((entry) => <article key={entry.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{entry.featuredImage && <img src={entry.featuredImage} alt="" className="h-56 w-full object-cover" />}<div className="p-6"><h2 className="text-2xl font-bold text-white">{entry.title}</h2>{entry.excerpt && <p className="mt-3 leading-7 text-muted-foreground">{entry.excerpt}</p>}{"content" in entry.body && typeof entry.body.content === "string" && <p className="mt-5 whitespace-pre-wrap leading-7 text-white/80">{entry.body.content}</p>}</div></article>) : <p className="rounded-2xl border border-white/10 p-8 text-muted-foreground">No published content yet.</p>}</div></div>;
}