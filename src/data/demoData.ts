import { ProductSchema } from '../database/ProductOS';
import { CustomerSchema } from '../database/CustomerOS';

export const demoProducts: ProductSchema[] = [
  { id: 'demo-coffee', name: 'Coffee', amount: 3.5 },
  { id: 'demo-tea', name: 'Tea', amount: 2.75 },
  { id: 'demo-croissant', name: 'Butter croissant', amount: 4.25 },
  { id: 'demo-sandwich', name: 'Veggie sandwich', amount: 8.5 },
  { id: 'demo-cookie', name: 'Chocolate chip cookie', amount: 2.5 },
  { id: 'demo-juice', name: 'Orange juice', amount: 4 },
];
export const demoCustomers: CustomerSchema[] = [
  { id: 'demo-alex', name: 'Alex Morgan (sample)', phoneNumber: '202-555-0101' },
  { id: 'demo-sam', name: 'Sam Taylor (sample)', phoneNumber: '202-555-0102' },
  { id: 'demo-jordan', name: 'Jordan Lee (sample)', phoneNumber: '202-555-0103' },
];
