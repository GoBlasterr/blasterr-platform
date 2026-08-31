import { useEffect, useState } from "react";

type CmsEntry = {
  id: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  body: Record<string, unknown>;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function CmsHomepageSurface() {
  const [entry, setEntry] = useState<CmsEntry | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void fetch("/api/cms/public/entries?type=homepage", { credentials: "include" })
        .then((response) => response.ok ? response.json() : [])
        .then((entries: CmsEntry[]) => { if (active) setEntry(entries[0] ?? null); })
        .catch(() => undefined);
    };
    load();
    const events = new EventSource("/api/cms/events", { withCredentials: true });
    events.addEventListener("cms.updated", load);
    return () => { active = false; events.close(); };
  }, []);

  if (!entry) return null;
  const eyebrow = text(entry.body.eyebrow);
  const ctaLabel = text(entry.body.ctaLabel);
  const ctaUrl = text(entry.body.ctaUrl);
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-primary/[0.06] px-5 py-6" aria-label="Featured website content">
      {entry.featuredImage && <img src={entry.featuredImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />}
      <div className="relative">
        {eyebrow && <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold text-white">{entry.title}</h2>
        {entry.excerpt && <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>}
        {ctaLabel && ctaUrl && <a href={ctaUrl} className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/15 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/25">{ctaLabel}</a>}
      </div>
    </section>
  );
}