import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePhone,
  normalizeEmail,
  normalizeStatus,
} from "../dist/utils/normalize.js";

test("normalizePhone rejects date-like values", () => {
  assert.equal(normalizePhone("2024-01-15"), "");
  assert.equal(normalizePhone("2024/01/15 10:30"), "");
  assert.equal(normalizePhone("9876543210"), "9876543210");
});

test("normalizeEmail normalizes addresses", () => {
  assert.equal(normalizeEmail(" USER@Example.com "), "user@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
});

test("normalizeStatus maps common values", () => {
  assert.equal(normalizeStatus("Follow Up"), "GOOD_LEAD_FOLLOW_UP");
  assert.equal(normalizeStatus("Bad Lead"), "BAD_LEAD");
  assert.equal(normalizeStatus("Unknown"), "");
});
