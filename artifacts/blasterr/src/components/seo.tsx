import { useEffect } from "react";

const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
const siteUrl = (configuredSiteUrl || "https://goblasterr.com").replace(/\/+$/, "");
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export type SeoJsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

function routePath(pathname = window.location.pathname): string {
  const withoutBase = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  const normalized = withoutBase.replace(/^\/+/, "");
  return normalized ? `/${normalized}` : "/";
}

export function canonicalUrl(pathname?: string): string {
  const path = routePath(pathname);
  return `${siteUrl}${basePath}${path === "/" ? "/" : path}`;
}

export function absoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${basePath}/${value.replace(/^\/+/, "")}`;
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  element.dataset.blasterrSeo = "true";
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
  element.dataset.blasterrSeo = "true";
}

function setPageSchema(value?: SeoJsonLd) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-blasterr-page-schema="true"]',
  );
  if (!value) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement("script");
  element.type = "application/ld+json";
  element.dataset.blasterrPageSchema = "true";
  element.textContent = JSON.stringify(value);
  if (!existing) document.head.appendChild(element);
}

export function Seo({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
  noIndex = false,
  jsonLd,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  jsonLd?: SeoJsonLd;
}) {
  useEffect(() => {
    const canonical = canonicalUrl(canonicalPath);
    const imageUrl = absoluteUrl(image) ?? absoluteUrl("logo.png")!;
    const robots = noIndex ? "noindex, nofollow" : "index, follow";

    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:image:alt", `${title} preview`);
    setMeta("property", "og:site_name", "Blasterr");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
    setCanonical(canonical);
    setPageSchema(jsonLd);
  }, [canonicalPath, description, image, jsonLd, noIndex, title, type]);

  return null;
}
