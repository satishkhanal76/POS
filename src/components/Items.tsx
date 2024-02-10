import { useState } from "react";
import DB from "../database/Database";
import ItemForm, { IFormData } from "./ItemForm";
import { v4 as uuidv4 } from "uuid";
import { IItem, Item } from "../model/Item";
import ItemDB, { IItemDB, ItemSchema } from "../database/ItemDB";
import ItemController from "../controllers/ItemController";

const Items = () => {
  const db = new DB();
  const itemDB: IItemDB = new ItemDB(db);

  const itemController = new ItemController();

  const [items, setItems] = useState<ItemSchema[]>([]);

  const handleAddingItem = async (formData: IFormData) => {
    let obj: ItemSchema = {
      id: uuidv4(),
      name: formData.name,
      price: Number.parseFloat(formData.price.toString()),
    };

    const item: IItem = new Item(obj as ItemSchema);

    itemDB.addItem(item);

    try {
      const allItems = await itemDB.getAll();

      setItems(allItems);
    } catch (err) {
      console.log("THere aas an error");
    }
  };
  return (
    <>
      <ItemForm onFormSubmit={handleAddingItem} />
      <div>
        {items.map((item: ItemSchema) => (
          <div key={item.id}>
            {item.name} - {item.price}
          </div>
        ))}
      </div>
    </>
  );
};

export default Items;
