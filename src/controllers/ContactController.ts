import { getLocaleText } from "../contexts/Locale";
import ContactOS, { ContactSchema, IContactOS } from "../database/ContactOS";
import Contact, { IContact } from "../models/Contact";
import { v4 as uuidv4 } from "uuid";
import Controller, { IController } from "./Controller";
export interface IContactFormData {
  name: string;
  phoneNumber: string;
}
export interface IContactController<S, I, OS> extends IController<S, I, OS> {
  handleFormSubmit: (data: S) => Promise<I>;
  getAllContacts: () => Promise<I[]>;
  deleteContact: (contact: I) => Promise<I>;
}
export default class ContactController
  extends Controller<ContactSchema, IContact, ContactOS>
  implements IContactController<ContactSchema, IContact, IContactOS>
{
  constructor(contactOS: ContactOS) {
    super(contactOS);
  }
  public async handleFormSubmit({ name, phoneNumber }: IContactFormData) {
    if (!name?.trim())
      throw new Error(getLocaleText("UI_ENTER_A_CUSTOMER_NAME"));
    const contact: IContact = new Contact({
      id: uuidv4(),
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
    });
    return this.addOne(contact);
  }
  public async updateContact(
    id: string,
    { name, phoneNumber }: IContactFormData,
  ): Promise<Contact> {
    if (!name.trim())
      throw new Error(getLocaleText("UI_ENTER_A_CUSTOMER_NAME"));
    return this.objectStore.updateOne(
      new Contact({ id, name: name.trim(), phoneNumber: phoneNumber.trim() }),
    );
  }
  public getAllCustomers() {
    return this.getAllContacts();
  }
  public updateCustomer(id: string, data: IContactFormData) {
    return this.updateContact(id, data);
  }
  public deleteCustomer(contact: IContact) {
    return this.deleteContact(contact);
  }
  public async getAllContacts() {
    return await this.getAll();
  }
  public async deleteContact(contact: IContact) {
    await this.deleteOne(contact.getId());
    return contact;
  }
}
