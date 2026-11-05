import { useLocaleText } from '../../contexts/Locale';
import CustomerEditForm from "../Customer/CustomerEditForm";
import PageHeader from "../Layout/PageHeader";
import React, { useEffect, useState } from "react";
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
  const [error, setError] = useState("");

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
  
    const handleDelete = async (customer: ICustomer) => {
      setError('');
      try {
        const deletedCustomer = await customerController.deleteCustomer(customer);
        setCustomers(current => current.filter(entry => entry.getId() !== deletedCustomer.getId()));
      } catch (failure) { setError(failure instanceof Error ? failure.message : t('CUSTOMER_DELETE_FAILED')); }

    };
  
    useEffect(() => {
      customerController
        .getAllCustomers()
        .then((allCustomers) => setCustomers(allCustomers));
    }, []);
    
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
          {editing && <CustomerEditForm customer={editing} onClose={() => setEditing(null)} onSaved={updated => {
            setCustomers(current => current.map(customer => customer.getId() === updated.getId() ? updated : customer));
            setEditing(null);
          }} />}
          <PageHeader title={text.CUSTOMERS_TITLE} actions={<button type="button" className="page-add-button" onClick={() => setIsModalOpen(true)} aria-label={t('CUSTOMER_FORM_TITLE')} title={t('CUSTOMER_FORM_TITLE')}><MdAdd aria-hidden="true" /></button>} />
          {error && <p role="alert">{error}</p>}
          <CustomersView onEdit={setEditing} handleDelete={handleDelete} customers={customers} />
        </>;
};

export default CustomersPage;
