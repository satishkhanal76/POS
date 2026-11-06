/** A shared identity; sales and purchasing records determine its role. */
export interface IContact {
  deletedAt?: number;
  getId: () => string;
  getName: () => string;
  getPhoneNumber: () => string;
}
export interface ContactParams {
  id: string;
  name: string;
  phoneNumber: string;
}
export default class Contact implements IContact {
  public deletedAt?: number;
  constructor(private readonly data: ContactParams) {}
  getId() {
    return this.data.id;
  }
  getName() {
    return this.data.name;
  }
  getPhoneNumber() {
    return this.data.phoneNumber;
  }
}
