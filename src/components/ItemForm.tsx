import { useState } from "react";

export interface IFormData {
  name: string;
  price: number;
}

interface IItemFormProps extends React.HtmlHTMLAttributes<HTMLFormElement> {
  onFormSubmit: (formData: IFormData) => void;
}

const ItemForm = ({ onFormSubmit, ...otherProps }: IItemFormProps) => {
  const [formData, setFormData] = useState<IFormData>({
    name: "",
    price: 0,
  });

  const handleOnChange = (eve: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [eve.target.name]: eve.target.value,
    });
  };

  return (
    <form
      action="get"
      onSubmit={(eve) => {
        eve.preventDefault();
        onFormSubmit(formData);
      }}
      {...otherProps}
    >
      <label htmlFor="name">Name: </label>
      <input
        id="name"
        name="name"
        type="text"
        onChange={handleOnChange}
        value={formData.name}
        placeholder="Name"
      />

      <label htmlFor="price">Price: </label>
      <input
        id="price"
        name="price"
        type="number"
        onChange={handleOnChange}
        value={formData.price}
        placeholder="Base Price.."
      />
      <button type="submit">Add Item</button>
    </form>
  );
};

export default ItemForm;
