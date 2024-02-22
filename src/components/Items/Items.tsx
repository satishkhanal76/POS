import { useEffect, useMemo, useState } from "react";
import { IItem } from "../../model/Item";
import ItemsController, {
  IItemFormData,
} from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomForm from "../Customer/CustomForm";
import "./Items.css";
import { useLocale } from "../../contexts/Locale";
import ItemsView from "./ItemsView";

const Items = () => {
  const text = useLocale();
  const [items, setItems] = useState<IItem[]>([]);

  const { itemOS } = useDatabase();

  const itemController = new ItemsController(itemOS);

  const handleAddingItem = async (formData: IItemFormData) => {
    const item = await itemController.handleFormSubmit(formData);

    if (item) {
      setItems([...items, item]);
    }
  };

  const handleDelete = async (item: IItem) => {
    if (localStorage.getItem("deleteConfirmAsked") !== "TRUE") {
      const wantsToDelete = confirm(text.ITEM_DELETION_WARNING_MESSAGE);
      if (!wantsToDelete) return;
      localStorage.setItem("deleteConfirmAsked", "TRUE");
    }

    const deletedItem = await itemController.deleteItem(item);
    if (!deletedItem) return;
    setItems((i) => i.filter((item) => item.getId() !== deletedItem.getId()));
  };

  useMemo(() => {
    itemController.getAllItems().then((data) => setItems(data));
  }, []);

  return (
    <>
      <CustomForm<IItemFormData>
        inputsProps={[
          {
            name: "name",
            id: "name",
            type: "text",
            placeholder: text.INPUT_ITEM_NAME_PLACE_HOLDER,
            label: text.INPUT_ITEM_NAME_LABEL,
          },
          {
            name: "price",
            id: "price",
            type: "text",
            placeholder: text.INPUT_ITEM_PRICE_PLACE_HOLDER,
            label: text.INPUT_ITEM_PRICE_LABEL,
          },
          {
            name: "button",
            id: "submit-button",
            type: "submit",
            value: text.INPUT_FORM_SUBMIT_BUTTON,
          },
        ]}
        onFormSubmit={handleAddingItem}
        formTitle={text.ITEM_FORM_TITLE}
      ></CustomForm>

      <ItemsView handleDelete={handleDelete} items={items}></ItemsView>
    </>
  );
};

export default Items;
