import useDeletedVisibility from '../../hooks/useDeletedVisibility';
import DeletedVisibility from '../utils/DeletedVisibility';
import { useLocaleText } from '../../contexts/Locale';
import CustomerEditForm from "../Customer/CustomerEditForm";
import PageHeader from "../Layout/PageHeader";
import React, { useCallback, useEffect, useState } from "react";
import FullScreenModal from "../Modals/FullScreenModal";
import CustomForm from "../Customer/CustomForm";
import { useLocale } from "../../contexts/Locale";
import { ICustomer } from "../../models/Customer";
import { useDatabase } from "../../contexts/DatabaseContext";
import CustomerController, { ICustomerFormData } from "../../controllers/CustomerController";
import { MdAdd } from "react-icons/md";
import CustomersView from "../Customer/CustomersView";

const CustomersPage = () => {
  const t = useLocaleText();
  const { includeDeleted } = useDeletedVisibility();

  const [editing, setEditing] = useState<ICustomer | null>(null);
  const [isAddModalOpen, setIsModalOpen] = useState<boolean>(false);
    
  
    const text = useLocale();
    const [customers, setCustomers] = useState<ICustomer[]>([]);
    const { customerOS } = useDatabase();
    const customerController = new CustomerController(customerOS);
  
    const handleFormSubmit = async (formData: ICustomerFormData) => {
      try {
        const customer = await customerController.handleFormSubmit(formData);
        setCustomers([...customers, customer]);
      } catch (err) {
        console.error(err);
      }
    };
  
    const refresh = useCallback(() => customerOS.getAll(undefined, includeDeleted).then(setCustomers), [customerOS, includeDeleted]);
    useEffect(() => { void refresh(); }, [refresh]);
    
  return <>
          {isAddModalOpen && <FullScreenModal title={text.CUSTOMER_FORM_TITLE} onClose={() => setIsModalOpen(false)}>
            <CustomForm<ICustomerFormData>
              inputsProps={[
                {
                  name: "name",
                  id: "name",
                  type: "text",
                  placeholder: text.INPUT_CUSTOMER_NAME_PLACE_HOLDER,
                  label: text.INPUT_CUSTOMER_NAME_LABEL,
                },
                {
                  name: "phoneNumber",
                  id: "phone-number",
                  type: "text",
                  placeholder: text.INPUT_CUSTOMER_PHONE_PLACE_HOLDER,
                  label: text.INPUT_CUSTOMER_PHONE_LABEL,
                },
                {
                  name: "button",
                  id: "submit-button",
                  type: "submit",
                  value: text.CUSTOMER_FORM_SUBMIT_BUTTON,
                  className: "btn"
                },
              ]}
              onFormSubmit={handleFormSubmit}
            ></CustomForm>
          </FullScreenModal>}
          {editing && <CustomerEditForm customer={editing} onClose={() => setEditing(null)} onSaved={() => {
            void refresh();
            setEditing(null);
          }} />}
          <PageHeader title={text.CUSTOMERS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label={t('CUSTOMER_FORM_TITLE')} title={t('CUSTOMER_FORM_TITLE')}><MdAdd aria-hidden="true" /></button>} />
          <DeletedVisibility />
          <CustomersView onDeleted={() => void refresh()} onEdit={setEditing} handleDelete={() => {}} customers={customers} />
        </>;
};

export default CustomersPage;
