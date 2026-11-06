import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  parseQuantity,
  MAX_QUANTITY,
} from "../src/validators/QuantityValidator";
import { resetEnvironment } from "./helpers/environment";

beforeEach(resetEnvironment);
test("quantity input accepts positive quantities with up to three decimal places", () => {
  assert.equal(parseQuantity("1"), 1);
  assert.equal(parseQuantity("2.5"), 2.5);
  assert.equal(parseQuantity("0.125"), 0.125);
  assert.equal(parseQuantity(" 25 "), 25);
  assert.equal(parseQuantity(String(MAX_QUANTITY)), MAX_QUANTITY);
});
test("quantity input rejects blank, excessive precision, non-finite, zero, negative, and unsafe values", () => {
  for (const value of [
    "",
    " ",
    "2.5555",
    "0.0001",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "abc",
    "2abc",
    String(Number.MAX_SAFE_INTEGER + 1),
  ]) {
    assert.throws(() => parseQuantity(value), value);
  }
});
