import DeleteRecordButton from '../utils/DeleteRecordButton';
import { useLocaleText } from '../../contexts/Locale';

import { useLocale } from "../../contexts/Locale";
import { ICustomer } from "../../models/Customer";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";

interface ICustomersViewProps {
  customers: ICustomer[];
  onDeleted?: () => void;
  onEdit: (customer: ICustomer) => void;
  handleDelete: (customer: ICustomer) => void;
}

const CustomersView = ({customers, onDeleted, onEdit}: ICustomersViewProps) => {
  const t = useLocaleText();
  const text = useLocale();

  const columns: CustomTableColumn<ICustomer>[] = [
    {key: "name", header: text.CUSTOMER_TABLE_HEADER_NAME, render: (customer) => <>{customer.getName()}</>},
    {key: "phone-number", header: text.CUSTOMER_TABLE_HEADER_PHONE, render: (customer) => <>{customer.getPhoneNumber()}</>},
    {key: "actions", header: t('UI_ACTIONS'), variant: "actions", render: (customer) => <><button type="button" aria-label={t('UI_EDIT_VALUE', { value0: customer.getName() })} onClick={() => onEdit(customer)}>{t('UI_EDIT')}</button><DeleteRecordButton table="CUSTOMER" id={customer.getId()} name={customer.getName()} deleted={!!customer.deletedAt} onDeleted={onDeleted} /></>},

  ];
  return (
    <CustomTableView label={t('CUSTOMERS_TITLE')} emptyTitle={t('UI_NO_CUSTOMERS_YET')} emptyDescription={t('UI_USE_THE_ADD_BUTTON_ABOVE_TO_ADD_YOUR_FIRST')} data={customers} columns={columns} rowKey={(customer) => customer.getId()} />
  );
};

export default CustomersView;
