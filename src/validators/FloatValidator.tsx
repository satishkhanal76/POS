import IntegerValidator, { IntegerValidatorOptions } from "./IntegerValidator";

export interface FloatValidatorOptions extends IntegerValidatorOptions {
  roundDecimal?: boolean;
  numOfDecimalPlaces?: number;
}

export default class FloatValidator extends IntegerValidator {
  protected declare options: FloatValidatorOptions;
  constructor(value: any, options: FloatValidatorOptions) {
    super(value, options);
    this.options = {
      ...this.options,
      roundDecimal: true,
      numOfDecimalPlaces: 2,
    };

    this.value = Number.parseFloat(value.toString());
    this.validate();
  }

  protected validate(): void {
    super.validate();
    if (this.options.roundDecimal) {
    }
  }

  public getSerializedValue() {
    return this.value;
  }
}
