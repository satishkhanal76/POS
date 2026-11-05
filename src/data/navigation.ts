/** Navigation content lives here; dropdown behavior stays in the UI component. */
export interface NavigationLink {
  path: string;
  label: string;
  localeKey: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  localeKey: string;
  links: NavigationLink[];
  /** Detail pages that should also highlight this group. */
  relatedPaths?: string[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'manage', label: 'Manage', localeKey: 'NAVBAR_MANAGE',
    links: [
      { path: '/items', label: 'Items', localeKey: 'NAVBAR_ITEM_2' },
      { path: '/customers', label: 'Customers', localeKey: 'NAVBAR_ITEM_1' },
    ],
  },
  {
    id: 'history', label: 'History', localeKey: 'NAVBAR_HISTORY',
    links: [
      { path: '/transactions', label: 'Transactions', localeKey: 'NAVBAR_ITEM_3' },
      { path: '/customers-transactions', label: 'Customer transactions', localeKey: 'NAVBAR_ITEM_4' },
    ],
    relatedPaths: ['/transaction', '/customer-transactions'],
  },
];
