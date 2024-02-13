import { useEffect, useState } from "react";
import { IItem } from "../model/Item";
import ItemController, { IItemFormData } from "../controllers/ItemController";
import { useDatabase } from "../contexts/DatabaseContext";
import CustomForm from "./CustomForm";
import "../styles/Items.css";
const Items = () => {
  const [items, setItems] = useState<IItem[]>([]);

  const { itemOS } = useDatabase();

  const itemController = new ItemController(itemOS);

  const handleAddingItem = async (formData: IItemFormData) => {
    const item = await itemController.handleFormSubmit(formData);

    if (item) {
      setItems([...items, item]);
    }
  };

  const handleDelete = async (item: IItem) => {
    const deletedItem = await itemController.deleteItem(item);
    if (deletedItem) {
      setItems(items.filter((item) => item.getId() !== deletedItem.getId()));
    }
  };

  useEffect(() => {
    itemController.getAllItems().then((data) => setItems(data));
  }, []);

  return (
    <>
      {/* <ItemForm onFormSubmit={handleAddingItem} /> */}
      <CustomForm<IItemFormData>
        inputsProps={[
          {
            name: "name",
            id: "name",
            type: "text",
            placeholder: "Item Name..",
            label: "Name:",
          },
          {
            name: "price",
            id: "price",
            type: "text",
            placeholder: "Enter Base Price..",
            label: "Price:",
          },
          {
            name: "button",
            id: "submit-button",
            type: "submit",
            value: "Add Item.",
          },
        ]}
        onFormSubmit={handleAddingItem}
        formTitle="Add A Item"
      ></CustomForm>
      <h2 className="items-title">Items</h2>
      <div className="items-container">
        {items.map((item: IItem) => (
          <div className="item" key={item.getId()}>
            {item.getName()} - ${item.getPrice()}
            <button
              className="item-delete-button"
              onClick={() => handleDelete(item)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default Items;
