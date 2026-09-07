import { createHash } from "node:crypto";

export const supportedLanguages = ["en", "fr", "es", "de", "pt", "it", "nl", "tr", "ru", "ar", "zh", "ja", "ko"] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

const countryLanguages: Record<string, SupportedLanguage> = {
  AR: "es", AT: "de", BE: "nl", BR: "pt", CA: "en", CH: "de", CN: "zh",
  DE: "de", ES: "es", FR: "fr", GB: "en", IE: "en", IT: "it", JP: "ja",
  KR: "ko", MX: "es", NL: "nl", NG: "en", NZ: "en", PT: "pt", RU: "ru",
  SA: "ar", TR: "tr", US: "en",
};

const aliases: Record<string, SupportedLanguage> = { "zh-cn": "zh", "zh-hans": "zh" };

export function normalizeLanguage(value?: string): SupportedLanguage | null {
  if (!value) return null;
  const code = value.trim().toLowerCase().split(",")[0]?.split(";")[0] ?? "";
  if (aliases[code]) return aliases[code];
  const base = code.split("-")[0] as SupportedLanguage;
  return supportedLanguages.includes(base) ? base : null;
}

export function detectViewerLanguage(country?: string, acceptLanguage?: string): SupportedLanguage {
  const byCountry = countryLanguages[(country ?? "").trim().toUpperCase()];
  return byCountry ?? normalizeLanguage(acceptLanguage) ?? "en";
}

export function translationCacheKey(text: string, targetLanguage: SupportedLanguage): string {
  return createHash("sha256").update(`${targetLanguage}\0${text}`).digest("hex");
}
