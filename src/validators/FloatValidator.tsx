import IntegerValidator, { IntegerValidatorOptions } from "./IntegerValidator";

export interface FloatValidatorOptions extends IntegerValidatorOptions {
  numOfDecimalPlaces?: number;
}

export default class FloatValidator extends IntegerValidator {
  protected declare options: FloatValidatorOptions;
  constructor(value: any, options?: FloatValidatorOptions) {
    super(value, options);
    this.options = {
      numOfDecimalPlaces: 2,
      ...this.options,
    };

    this.value = Number.parseFloat(value.toString());
    this.validate();
  }

  protected validate(): void {
    super.validate();
  }

  public getRoundedValue(): string {
    return this.value.toFixed(this.options.numOfDecimalPlaces);
  }

  public getSerializedValue() {
    return this.value;
  }
}
