import { createHash } from "node:crypto";

export const supportedLanguages = ["en", "fr", "es", "de", "pt", "it", "nl", "tr", "ru", "ar", "zh", "ja", "ko"] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

const countryLanguages: Record<string, SupportedLanguage> = {
  AR: "es", AT: "de", AU: "en", BE: "fr", BO: "es", BR: "pt", CA: "en",
  CH: "fr", CL: "es", CN: "zh", CO: "es", CR: "es", CU: "es", DE: "de",
  DO: "es", EC: "es", ES: "es", FR: "fr", GB: "en", GT: "es", HN: "es",
  IE: "en", IT: "it", JP: "ja", KR: "ko", MX: "es", NI: "es", NL: "nl",
  NG: "en", NZ: "en", PA: "es", PE: "es", PR: "es", PT: "pt", PY: "es",
  RU: "ru", SV: "es", TR: "tr", US: "en", UY: "es", VE: "es",
  AE: "ar", BH: "ar", DJ: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar",
  KM: "ar", KW: "ar", LB: "ar", LY: "ar", MA: "ar", MR: "ar", OM: "ar",
  PS: "ar", QA: "ar", SA: "ar", SD: "ar", SO: "ar", SY: "ar", TD: "ar",
  TN: "ar", YE: "ar",
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

export function languageForCountry(country?: string): SupportedLanguage {
  return countryLanguages[(country ?? "").trim().toUpperCase()] ?? "en";
}

export function isCountryCode(value?: string): value is string {
  return Boolean(value && /^[A-Za-z]{2}$/.test(value.trim()));
}

export function localeFromCookie(cookieHeader?: string): SupportedLanguage | null {
  const value = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("blasterr_locale="))
    ?.slice("blasterr_locale=".length);
  return normalizeLanguage(value);
}

export function translationCacheKey(text: string, targetLanguage: SupportedLanguage): string {
  return createHash("sha256").update(`${targetLanguage}\0${text}`).digest("hex");
}
