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

  constructor(value: any, options?: IntegerValidatorOptions) {
    this.value = Number.parseInt(value?.toString());
    value === null ? (this.isNull = true) : (this.isNull = false);

    this.options = {
      ...this.options,
      ...options,
    };
    this.isValid = true;

    this.validate();
  }

  protected validate() {
    if (!this.isANumber()) {
      this.isValid = false;
    }
    this.checkForRange();

    if (!this.isValid === this.options.useDefaultOnInvalid) {
      this.value = this.options.defaultValue || 0;
    }
  }

  private checkForRange() {
    let checkForRange = false;
    if (
      this.options.minValue !== -Infinity ||
      this.options.maxValue !== Infinity
    ) {
      checkForRange = true;
    }
    if (!checkForRange) return;
    let min = this.options.minValue || -Infinity,
      max = this.options.maxValue || Infinity;
    if (
      this.options.checkInclusive &&
      !IntegerValidator.isValueInRange(this.value, min, max)
    ) {
      this.isValid = false;
    }
    if (
      !this.options.checkInclusive &&
      !IntegerValidator.isValueInRange(this.value, min + 1, max - 1)
    ) {
      this.isValid = false;
    }
  }

  private static isValueInRange(value: number, min: number, max: number) {
    return min <= value && value <= max;
  }

  private isANumber() {
    return !isNaN(this.value);
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
