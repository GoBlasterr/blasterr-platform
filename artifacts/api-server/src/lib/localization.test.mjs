import assert from "node:assert/strict";
import test from "node:test";
import { detectViewerLanguage, normalizeLanguage, translationCacheKey } from "./localization.ts";

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

test("translation cache keys never expose original user text", () => {
  const key = translationCacheKey("private user text", "fr");
  assert.equal(key.length, 64);
  assert.equal(key.includes("private"), false);
  assert.notEqual(key, translationCacheKey("private user text", "de"));
});