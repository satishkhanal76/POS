import { useMemo, useState } from "react";
import { useDatabase } from "../../contexts/DatabaseContext";
import SearchableModal, { ISearchableItem } from "../Modals/SearchableModal";
import CustomerController from "../../controllers/CustomerController";
import { ICustomer } from "../../models/Customer";

interface ItemSelectionModalProps {
  handleAddItem: (customer: ICustomer | null) => void;
  isModalOpen?: boolean;
  onClose: () => void;
}

const CustomerSelectionModal = ({
  handleAddItem,
  onClose,
  isModalOpen = false,
}: ItemSelectionModalProps) => {
  const { customerOS } = useDatabase();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const customerController = new CustomerController(customerOS);

  useMemo(() => {
    const loadItems = async () => {
      const allCustomers = await customerController.getAllCustomers();
      setCustomers(allCustomers);
    };

    loadItems();
  }, []);

  const searchableItemProps: ISearchableItem[] = customers.map((customer) => ({
    id: customer.getId(),
    name: customer.getName(),
    children: (
      <>
        <span className="name">{customer.getName()}</span>
      </>
    ),
  }));

  if (isModalOpen)
    return (
      <SearchableModal
        onClose={onClose}
        items={searchableItemProps}
        handleAdd={(searchableItem: ISearchableItem) =>
          handleAddItem(
            customers.find((i) => i.getId() === searchableItem.id) || null
          )
        }
      />
    );
};

export default CustomerSelectionModal;
