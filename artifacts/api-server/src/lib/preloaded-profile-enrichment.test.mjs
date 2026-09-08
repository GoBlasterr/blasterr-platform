import assert from "node:assert/strict";
import test from "node:test";
import { selectWikipediaLogoTitle } from "./preloaded-profile-image-selection.ts";

test("selects an exact entity-named SVG when the filename omits logo", () => {
  const selected = selectWikipediaLogoTitle("Boston Celtics", [
    "File:Commons-logo.svg",
    "File:Basketball Clipart.svg",
    "File:Boston Celtics.svg",
    "File:CelticsWordmark.svg",
  ]);

  assert.equal(selected, "File:Boston Celtics.svg");
});

test("selects the entity logo instead of generic article icons", () => {
  const selected = selectWikipediaLogoTitle("Los Angeles Lakers", [
    "File:Closed Access logo transparent.svg",
    "File:Commons-logo.svg",
    "File:Los Angeles Lakers Wordmark Logo 2001-current.svg",
    "File:Los Angeles Lakers logo.svg",
  ]);

  assert.equal(selected, "File:Los Angeles Lakers logo.svg");
});