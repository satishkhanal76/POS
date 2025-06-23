
import CustomForm from '../Customer/CustomForm'
import { useLocale } from '../../contexts/Locale'
import FullScreenModal from '../Modals/FullScreenModal';
import ItemsController, { IItemFormData } from '../../controllers/ItemsController';
import { useDatabase } from '../../contexts/DatabaseContext';
import  { IProductItem } from '../../models/ProductItem';


interface IItemAddFormProps {
  onClose: () => void;
  onAddItem?: (item: IProductItem) => void;
}

const ItemAddForm = ({onClose, onAddItem}: IItemAddFormProps) => {
    const text = useLocale();
    const {itemOS} = useDatabase();



    const itemController = new ItemsController(itemOS);

    const handleAddingItem = async (formData: IItemFormData) => {

      const item = await itemController.handleFormSubmit(formData);
      if(!item) return;
      if(onAddItem) onAddItem(item);

    };

    //all of the input items
    const FORM_INPUTS = [
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
    ];

  return (
    <FullScreenModal onClose={onClose}>
      <CustomForm<IItemFormData> inputsProps={FORM_INPUTS} onFormSubmit={handleAddingItem} formTitle={text.ITEM_FORM_TITLE}></CustomForm>
    </FullScreenModal>
  )
}

export default ItemAddForm