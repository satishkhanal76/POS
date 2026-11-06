import { IDataBaseContext } from '../database/DatabaseStores';
import PickerStore from '../database/PickerStore';
import { ProductSchema } from '../database/ProductOS';
import { ContactSchema } from '../database/ContactOS';
import { PickerOptions } from '../pickers/types';

export default class PickerController {
    private readonly store: PickerStore;
    constructor(private readonly stores: Pick<IDataBaseContext, 'database' | 'itemOS' | 'contactOS'>) { this.store = new PickerStore(stores.database); }
    async items(options: PickerOptions) {
        const result = await this.store.getPage('PRODUCTS', options);
        return { ...result, rows: await Promise.all(result.rows.map(row => this.stores.itemOS.getSchemaAsObject(row as ProductSchema))) };
    }
    async contacts(options: PickerOptions) {
        const result = await this.store.getPage('CUSTOMER', options);
        return { ...result, rows: await Promise.all(result.rows.map(row => this.stores.contactOS.getSchemaAsObject(row as ContactSchema))) };
    }
}
