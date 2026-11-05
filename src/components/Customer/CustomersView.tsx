
import { useLocale } from "../../contexts/Locale";
import { ICustomer } from "../../models/Customer";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";

interface ICustomersViewProps {
  customers: ICustomer[];
  onEdit: (customer: ICustomer) => void;
  handleDelete: (customer: ICustomer) => void;
}

const CustomersView = ({customers, handleDelete, onEdit}: ICustomersViewProps) => {
  const text = useLocale();

  const columns: CustomTableColumn<ICustomer>[] = [
    {key: "name", header: text.CUSTOMER_TABLE_HEADER_NAME, render: (customer) => <>{customer.getName()}</>},
    {key: "phone-number", header: text.CUSTOMER_TABLE_HEADER_PHONE, render: (customer) => <>{customer.getPhoneNumber()}</>},
    {key: "actions", header: "Actions", variant: "actions", render: (customer) => <><button type="button" aria-label={`Edit ${customer.getName()}`} onClick={() => onEdit(customer)}>Edit</button><button type="button" className="table-delete" aria-label={`Delete ${customer.getName()}`} onClick={() => handleDelete(customer)}>{text.CUSTOMER_TABLE_DELETE_BUTTON}</button></>},

  ];
  return (
    <CustomTableView label="Customers" emptyTitle="No customers yet" emptyDescription="Use the add button above to add your first customer." data={customers} columns={columns} rowKey={(customer) => customer.getId()} />
  );
};

export default CustomersView;
