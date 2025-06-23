import React from "react";

export interface IButtonProps
  extends React.HtmlHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

const Button = ({ disabled, children, ...otherProps }: IButtonProps) => {
  return (
    <button className="btn pill" disabled={disabled} {...otherProps}>
      {children}
    </button>
  );
};

export default Button;
