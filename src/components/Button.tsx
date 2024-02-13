import React from "react";

interface IButtonProps extends React.HtmlHTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
}

const Button = ({ disabled, children, ...otherProps }: IButtonProps) => {
  return (
    <button disabled={disabled} {...otherProps}>
      {children}
    </button>
  );
};

export default Button;
