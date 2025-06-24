import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import ProductItem, { IProductItem } from "../../models/ProductItem";
import ItemsController, {
  IItemFormData,
} from "../../controllers/ItemsController";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomForm from "../Customer/CustomForm";
import { useLocale } from "../../contexts/Locale";
import ItemsView from "./ItemsView";
import "./Items.css";
import FullScreenModal from "../Modals/FullScreenModal";

const Items = () => {
  const text = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<IProductItem[]>([]);

  const { itemOS } = useDatabase();

  const itemController = new ItemsController(itemOS);

  const handleAddingItem = async (formData: IItemFormData) => {
    const item = await itemController.handleFormSubmit(formData);

    if (item) {
      setItems([...items, item]);
    }
  };

  const handleDelete = async (item: IProductItem) => {
    if (localStorage.getItem("deleteConfirmAsked") !== "TRUE") {
      const wantsToDelete = confirm(text.ITEM_DELETION_WARNING_MESSAGE);
      if (!wantsToDelete) return;
      localStorage.setItem("deleteConfirmAsked", "TRUE");
    }

    const deletedItem = await itemController.deleteItem(item);
    if (!deletedItem) return;
    setItems((i) => i.filter((item) => item.getId() !== deletedItem.getId()));
  };

  const handleDownloadClick = async () => {
    const json = await itemController.getAllAsJSONString();
    const filePath = `Items.json-${Date.now()}`;

    const blob = new Blob([json], { type: "application/json" });

    const element = document.createElement("a");

    element.href = window.URL.createObjectURL(blob);
    element.download = filePath;

    element.click();
  };

  const handleLoadItemsClick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", async (e) => {
      const contents = e.target?.result;
      if (!contents) return;
      const productItems = await itemController.addManyFromJSON(
        contents.toString()
      );
      setItems(productItems);
    });

    reader.readAsText(file);
  };

  useEffect(() => {
    itemController.getAllItems().then((data) => setItems(data));
  }, []);

  return (
    <>
      <FullScreenModal onClose={() => {}}>
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
              className: "btn",
              value: text.INPUT_FORM_SUBMIT_BUTTON,
            },
          ]}
          onFormSubmit={handleAddingItem}
        ></CustomForm>
      </FullScreenModal>

      <div className="backup-file-container">
        <button onClick={handleDownloadClick}>Download All Items</button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleLoadItemsClick}
        />
        <button onClick={() => fileInputRef.current?.click()}>
          Load Items from File
        </button>
      </div>

      <ItemsView handleDelete={handleDelete} items={items}></ItemsView>
    </>
  );
};

export default Items;