import { ProductSchema } from "../database/ProductOS";
import { CustomerSchema } from "../database/CustomerOS";

export const demoProducts: ProductSchema[] = [
  { id: "demo-coffee", name: "Coffee", amount: 3.5 },
  { id: "demo-tea", name: "Tea", amount: 2.75 },
  { id: "demo-croissant", name: "Butter croissant", amount: 4.25 },
  { id: "demo-sandwich", name: "Veggie sandwich", amount: 8.5 },
  { id: "demo-cookie", name: "Chocolate chip cookie", amount: 2.5 },
  { id: "demo-juice", name: "Orange juice", amount: 4 },
];
export const demoCustomers: CustomerSchema[] = [
  {
    id: "demo-alex",
    name: "Alex Morgan (sample)",
    phoneNumber: "202-555-0101",
  },
  { id: "demo-sam", name: "Sam Taylor (sample)", phoneNumber: "202-555-0102" },
  {
    id: "demo-jordan",
    name: "Jordan Lee (sample)",
    phoneNumber: "202-555-0103",
  },
];

/** Offsets are relative to the moment a fresh demo is created. */
export const demoPriceChanges = [
  {
    id: "demo-price-coffee-1",
    itemId: "demo-coffee",
    amount: 3.75,
    daysAgo: 10,
  },
  { id: "demo-price-coffee-2", itemId: "demo-coffee", amount: 4, daysAgo: 4 },
  {
    id: "demo-price-croissant",
    itemId: "demo-croissant",
    amount: 4.5,
    daysAgo: 7,
  },
  { id: "demo-price-sandwich", itemId: "demo-sandwich", amount: 9, daysAgo: 5 },
  { id: "demo-price-tea", itemId: "demo-tea", amount: 3, daysAgo: 2 },
  { id: "demo-price-cookie", itemId: "demo-cookie", amount: 2.25, daysAgo: 1 },
];

export interface DemoSalePattern {
  products: Array<{ id: string; quantity: number }>;
  discount?: "flat" | "percentage";
}
export const demoSalePatterns: DemoSalePattern[] = [
  {
    products: [
      { id: "demo-coffee", quantity: 2 },
      { id: "demo-croissant", quantity: 1 },
    ],
  },
  {
    products: [
      { id: "demo-tea", quantity: 1 },
      { id: "demo-cookie", quantity: 2 },
    ],
  },
  {
    products: [
      { id: "demo-sandwich", quantity: 1 },
      { id: "demo-juice", quantity: 1 },
    ],
    discount: "flat",
  },
  {
    products: [
      { id: "demo-coffee", quantity: 1 },
      { id: "demo-sandwich", quantity: 2 },
    ],
    discount: "percentage",
  },
  {
    products: [
      { id: "demo-croissant", quantity: 2 },
      { id: "demo-tea", quantity: 2 },
    ],
  },
  {
    products: [
      { id: "demo-coffee", quantity: 3 },
      { id: "demo-cookie", quantity: 3 },
    ],
    discount: "percentage",
  },
  {
    products: [
      { id: "demo-juice", quantity: 2 },
      { id: "demo-sandwich", quantity: 1 },
    ],
    discount: "flat",
  },
  {
    products: [
      { id: "demo-coffee", quantity: 1 },
      { id: "demo-tea", quantity: 1 },
      { id: "demo-cookie", quantity: 1 },
    ],
  },
];
export const DEMO_SALE_COUNT = 24;
