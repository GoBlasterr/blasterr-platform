import assert from "node:assert/strict";
import test from "node:test";
import { sentimentPercentages } from "./sentiment-percentages.ts";

test("sentiment percentages are zero when no sentiment reactions exist", () => {
  assert.deepEqual(sentimentPercentages(0, 0), {
    positivePercentage: 0,
    negativePercentage: 0,
  });
});

test("sentiment percentages represent the positive-to-negative ratio", () => {
  assert.deepEqual(sentimentPercentages(3, 1), {
    positivePercentage: 75,
    negativePercentage: 25,
  });
  assert.deepEqual(sentimentPercentages(1, 2), {
    positivePercentage: 33,
    negativePercentage: 67,
  });
});