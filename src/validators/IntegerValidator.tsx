export interface IntegerValidatorOptions {
  maxValue?: number;
  minValue?: number;
  defaultValue?: number;

  checkInclusive?: boolean;
  useDefaultOnInvalid?: boolean;
}

export default class IntegerValidator {
  protected value: number;
  protected isNull: boolean;
  protected options: IntegerValidatorOptions = {
    maxValue: Infinity,
    minValue: -Infinity,
    defaultValue: 0,
    checkInclusive: true,
    useDefaultOnInvalid: true,
  };

  private isValid: boolean;

  constructor(value: unknown, options?: IntegerValidatorOptions) {
    this.value = Number.parseInt(String(value));
    value === null ? (this.isNull = true) : (this.isNull = false);

    this.options = {
      ...this.options,
      ...options,
    };
    this.isValid = true;

    this.validate();
  }

  protected validate() {
    // FloatValidator validates again after parsing the full decimal value.
    this.isValid = true;
    if (!this.isANumber()) {
      this.isValid = false;
    }
    this.checkForRange();

    if (!this.isValid && this.options.useDefaultOnInvalid) {
      this.value = this.options.defaultValue ?? 0;
    }
  }

  private checkForRange() {
    const min = this.options.minValue ?? -Infinity;
    const max = this.options.maxValue ?? Infinity;
    const inRange = this.options.checkInclusive
      ? min <= this.value && this.value <= max
      : min < this.value && this.value < max;
    if (!inRange) this.isValid = false;
  }

  private isANumber() {
    return Number.isFinite(this.value);
  }

  public getSerializedValue() {
    return this.value;
  }

  public isValueValid() {
    return this.isValid;
  }

  public isValueNull() {
    return this.isNull;
  }
}
