import React from "react";
import { useClientGlobal } from "../../contexts/ClientGlobal";

interface PriceProps extends React.HTMLProps<HTMLSpanElement> {
  price: number;
}

const Price = ({ price, ...otherProps }: PriceProps) => {
  const { currencyCharacter } = useClientGlobal();
  return (
    <span className="price" {...otherProps}>
      {currencyCharacter}
      {price}
    </span>
  );
};

export default Price;
