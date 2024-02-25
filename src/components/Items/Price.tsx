import React from "react";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import FloatValidator from "../../validators/FloatValidator";

interface PriceProps extends React.HTMLProps<HTMLSpanElement> {
  price: number;
  isDeductionItem?: boolean;
}

const Price = ({
  price,
  isDeductionItem = false,
  ...otherProps
}: PriceProps) => {
  const { currencyCharacter, numOfDecimalPlaces } = useClientGlobal();
  const priceString = new FloatValidator(price, {
    numOfDecimalPlaces,
  }).getRoundedValue();
  return (
    <span className="price" {...otherProps}>
      {isDeductionItem
        ? `(${currencyCharacter}${priceString})`
        : `${currencyCharacter}${priceString}`}
    </span>
  );
};

export default Price;
