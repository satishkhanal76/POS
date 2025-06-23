import React, { HtmlHTMLAttributes, useRef, useState } from "react";
import "./CustomForm.css";

interface IInputProps extends React.HTMLProps<HTMLInputElement> {
  label?: string;
  name: string;
}
interface ICustomForm<IFormDataType extends { [key: string]: any }>
  extends HtmlHTMLAttributes<HTMLFormElement> {
  inputsProps: IInputProps[];
  onFormSubmit: (formData: IFormDataType) => void;
  formTitle?: string;
}

function CustomForm<IFormDataType extends { [key: string]: any }>({
  onFormSubmit,
  inputsProps,
  children,
  formTitle,
  ...otherprops
}: ICustomForm<IFormDataType>) {
  const initialFormData = Object.fromEntries(
    inputsProps.map((inputProp) => [inputProp.name, inputProp.value || ""])
  ) as IFormDataType;
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<IFormDataType>(initialFormData);

  const handleFormChange = (eve: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [eve.target.name]: eve.target.value,
    });
  };

  return (
    <form
      className="custom-form"
      {...otherprops}
      action="get"
      onSubmit={(eve) => {
        eve.preventDefault();
        setFormData(initialFormData);
        firstInputRef.current?.focus(); //reference the first element if form submitted
        onFormSubmit(formData);
      }}
    >
      {formTitle && <h3 className="form-title">{formTitle}</h3>}
      <div className="input-container-wrapper">
        {inputsProps.map((inputProp: IInputProps, i: number) => {
          return (
            <div className="input-container" key={inputProp.id}>
              {inputProp.label && (
                <label className="input-label" htmlFor={inputProp.name}>
                  {inputProp.label}
                </label>
              )}
              <input
                className="input"
                ref={i === 0 ? firstInputRef : null}
                {...inputProp}
                onChange={handleFormChange}
                value={formData[inputProp.name]}
              />
            </div>
          );
        })}
      </div>
      {children}
    </form>
  );
}

export default CustomForm;
