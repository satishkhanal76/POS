import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity } from '../src/validators/QuantityValidator';
import { resetEnvironment } from './helpers/environment';

beforeEach(resetEnvironment);
test('quantity input accepts positive whole numbers without truncation', () => {
  assert.equal(parseQuantity('1'), 1);
  assert.equal(parseQuantity(' 25 '), 25);
  assert.equal(parseQuantity(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
});
test('quantity input rejects blank, fractional, non-finite, zero, negative, and unsafe values', () => {
  for (const value of ['', ' ', '2.5', '0', '-1', 'NaN', 'Infinity', 'abc', '2abc', String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.throws(() => parseQuantity(value), value);
  }
});
