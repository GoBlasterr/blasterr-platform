import assert from "node:assert/strict";
import test from "node:test";
import {
  detectViewerLanguage,
  languageForCountry,
  localeFromCookie,
  normalizeLanguage,
  translationCacheKey,
  trustedCountryFromProxyHeaders,
} from "./localization.ts";

function countryFrom(headers, options = { production: true, replitDeployment: false }) {
  return trustedCountryFromProxyHeaders(
    (name) => headers[name.toLowerCase()],
    options,
  );
}

test("detects supported viewer languages from country with safe English fallback", () => {
  assert.equal(detectViewerLanguage("FR", "en-US"), "fr");
  assert.equal(detectViewerLanguage("NG", "fr"), "en");
  assert.equal(detectViewerLanguage(undefined, "ja-JP,ja;q=0.9"), "ja");
  assert.equal(detectViewerLanguage("XX", "xx"), "en");
});

test("normalizes supported locale variants", () => {
  assert.equal(normalizeLanguage("zh-Hans"), "zh");
  assert.equal(normalizeLanguage("pt-BR"), "pt");
  assert.equal(normalizeLanguage("sv-SE"), null);
});

test("maps required production countries and falls back to English", () => {
  const expected = {
    US: "en", NG: "en", FR: "fr", DE: "de", ES: "es", BR: "pt",
    JP: "ja", CN: "zh", KR: "ko", SA: "ar", XX: "en",
  };
  for (const [country, language] of Object.entries(expected)) {
    assert.equal(languageForCountry(country), language);
  }
});

test("accepts only supported locale cookies", () => {
  assert.equal(localeFromCookie("session=x; blasterr_locale=fr; other=y"), "fr");
  assert.equal(localeFromCookie("blasterr_locale=sv"), null);
  assert.equal(localeFromCookie(undefined), null);
});

test("trusts Vercel country only with production proxy evidence", () => {
  assert.equal(countryFrom({
    "x-vercel-ip-country": "us",
    "x-vercel-id": "cle1::request-id",
  }), "US");
  assert.equal(countryFrom({ "x-vercel-ip-country": "us" }), undefined);
  assert.equal(countryFrom({
    "x-vercel-ip-country": "USA",
    "x-vercel-id": "cle1::request-id",
  }), undefined);
});

test("preserves Cloudflare-first country precedence and evidence checks", () => {
  assert.equal(countryFrom({
    "cf-ipcountry": "ca",
    "cf-ray": "ray-id",
    "cf-connecting-ip": "192.0.2.1",
    "x-vercel-ip-country": "us",
    "x-vercel-id": "cle1::request-id",
  }), "CA");
  assert.equal(countryFrom({
    "cf-ipcountry": "ca",
    "x-vercel-ip-country": "us",
    "x-vercel-id": "cle1::request-id",
  }), "US");
  assert.equal(countryFrom({ "cf-ipcountry": "ca" }), undefined);
});

test("trusts Replit country only with deployment proxy evidence in production", () => {
  const headers = { "x-country-code": "gb", "x-forwarded-for": "192.0.2.2" };
  assert.equal(countryFrom(headers, { production: true, replitDeployment: true }), "GB");
  assert.equal(countryFrom(headers, { production: true, replitDeployment: false }), undefined);
  assert.equal(countryFrom({ "x-country-code": "gb" }, { production: true, replitDeployment: true }), undefined);
  assert.equal(countryFrom({ "x-country-code": "gb" }, { production: false, replitDeployment: false }), "GB");
});

test("translation cache keys never expose original user text", () => {
  const key = translationCacheKey("private user text", "fr");
  assert.equal(key.length, 64);
  assert.equal(key.includes("private"), false);
  assert.notEqual(key, translationCacheKey("private user text", "de"));
});