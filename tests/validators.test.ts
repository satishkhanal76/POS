import { test } from 'node:test';
import assert from 'node:assert/strict';
import IntegerValidator from '../src/validators/IntegerValidator';
import FloatValidator from '../src/validators/FloatValidator';

test('integer validation preserves valid values when fallback is disabled', () => {
  const validator = new IntegerValidator('5', { useDefaultOnInvalid: false });
  assert.equal(validator.isValueValid(), true);
  assert.equal(validator.getSerializedValue(), 5);
});
test('zero is a real minimum or maximum, rather than an absent bound', () => {
  assert.equal(new IntegerValidator(-1, { minValue: 0 }).isValueValid(), false);
  assert.equal(new IntegerValidator(1, { maxValue: 0 }).isValueValid(), false);
  assert.equal(new IntegerValidator(0, { minValue: 0, maxValue: 0 }).isValueValid(), true);
});
test('invalid integers use the configured fallback and retain invalid status', () => {
  const validator = new IntegerValidator('invalid', { defaultValue: 7 });
  assert.equal(validator.isValueValid(), false);
  assert.equal(validator.getSerializedValue(), 7);
});
test('cancelled numeric input is distinguishable from a valid zero', () => {
  assert.equal(new IntegerValidator(null).isValueNull(), true);
  assert.equal(new IntegerValidator(0).isValueNull(), false);
});
test('float validation handles decimal bounds and formatting', () => {
  const validator = new FloatValidator('0.75', { minValue: 0.5, maxValue: 1, numOfDecimalPlaces: 3 });
  assert.equal(validator.isValueValid(), true);
  assert.equal(validator.getSerializedValue(), 0.75);
  assert.equal(validator.getRoundedValue(), '0.750');
});
test('exclusive float bounds permit values between the endpoints', () => {
  assert.equal(new FloatValidator(0.75, { minValue: 0.5, maxValue: 1, checkInclusive: false }).isValueValid(), true);
  assert.equal(new FloatValidator(0.5, { minValue: 0.5, maxValue: 1, checkInclusive: false }).isValueValid(), false);
});
test('null and non-finite floats are invalid without throwing', () => {
  const cancelled = new FloatValidator(null);
  assert.equal(cancelled.isValueNull(), true);
  assert.equal(cancelled.isValueValid(), false);
  assert.equal(new FloatValidator(Infinity).isValueValid(), false);
});
