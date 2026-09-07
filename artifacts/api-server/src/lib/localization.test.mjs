import assert from "node:assert/strict";
import test from "node:test";
import {
  detectViewerLanguage,
  languageForCountry,
  localeFromCookie,
  normalizeLanguage,
  translationCacheKey,
} from "./localization.ts";

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

test("translation cache keys never expose original user text", () => {
  const key = translationCacheKey("private user text", "fr");
  assert.equal(key.length, 64);
  assert.equal(key.includes("private"), false);
  assert.notEqual(key, translationCacheKey("private user text", "de"));
});