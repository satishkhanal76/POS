import { useEffect, useRef, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import ItemController from "../../controllers/ItemController";
import { IItem } from "../../model/Item";

import "./DropDown.css";

interface AddItemsModalProps {
  handleAdd: (item: IItem) => void;
}

interface ItemDetails {
  item: IItem;
  matchesSearch: boolean;
}

const SearchableDropDown = ({ handleAdd }: AddItemsModalProps) => {
  const [itemsDetails, setItemsDetails] = useState<ItemDetails[]>();

  const { itemOS } = useDatabase();

  const itemController = new ItemController(itemOS);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    itemController
      .getAllItems()
      .then((data) =>
        setItemsDetails(data.map((d) => ({ item: d, matchesSearch: true })))
      );
  }, []);

  const handleOnChange = (eve: React.ChangeEvent<HTMLInputElement>) => {
    const input = eve.target.value;
    const f = input.toUpperCase();

    setItemsDetails((i) => {
      return i?.map((itemDetails) => {
        return itemDetails.item.getName().toUpperCase().indexOf(f) > -1
          ? { ...itemDetails, matchesSearch: true }
          : { ...itemDetails, matchesSearch: false };
      });
    });
  };
  return (
    <div className="dropdown-wrapper">
      <div className="dropdown-container">
        <div className="dropdown-search-wrapper">
          <input
            onChange={(eve) => handleOnChange(eve)}
            ref={inputRef}
            tabIndex={1}
            className="dropdown-search"
            type="text"
          />
        </div>
        <div className="dropdown-list">
          {itemsDetails
            ?.filter((itemDetails) => itemDetails.matchesSearch) //grabs all items that match the search details
            ?.map((itemDetails) => (
              <div
                onBeforeInput={() => {
                  handleAdd(itemDetails.item);
                }}
                tabIndex={1}
                key={itemDetails.item.getId()}
                className="dropdown-item"
                onClick={() => {
                  handleAdd(itemDetails.item);
                }}
              >
                <span className="name">{itemDetails.item.getName()}</span>
                <span className="price">${itemDetails.item.getPrice()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SearchableDropDown;
