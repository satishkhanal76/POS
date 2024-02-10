import React from "react";

interface IButtonProps extends React.HtmlHTMLAttributes<HTMLButtonElement> {}

const Button = ({ children, ...otherProps }: IButtonProps) => {
  return <button {...otherProps}>{children}</button>;
};

export default Button;
