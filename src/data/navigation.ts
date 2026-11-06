import { LocaleKey } from "../contexts/Locale";
/** Navigation content lives here; dropdown behavior stays in the UI component. */
export interface NavigationLink {
  path: string;
  localeKey: LocaleKey;
}

export interface NavigationGroup {
  id: string;
  localeKey: LocaleKey;
  links: NavigationLink[];
  /** Detail pages that should also highlight this group. */
  relatedPaths?: string[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: "reports",
    localeKey: "REPORT_NAV",
    links: [
      { path: "/dashboard", localeKey: "DASH_NAV" },
      { path: "/overview", localeKey: "REPORT_OVERVIEW" },
    ],
  },
  {
    id: "manage",
    localeKey: "NAVBAR_MANAGE",
    links: [
      { path: "/items", localeKey: "NAVBAR_ITEM_2" },
      { path: "/contacts", localeKey: "NAVBAR_ITEM_1" },
    ],
  },
  {
    id: "history",
    localeKey: "NAVBAR_HISTORY",
    links: [
      { path: "/price-history", localeKey: "NAVBAR_PRICE_HISTORY" },
      { path: "/transactions", localeKey: "NAVBAR_ITEM_3" },
      { path: "/customers-transactions", localeKey: "NAVBAR_ITEM_4" },
    ],
    relatedPaths: ["/transaction", "/customer-transactions"],
  },
];
