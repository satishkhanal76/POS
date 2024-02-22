import { ReactNode, createContext, useContext } from "react";
import LocaleJSON from "../data/Text_EN.json";

interface ILocaleContext {
  WEB_NAME: string;
}

const values = LocaleJSON as { [key: string]: any };

export const LocaleContext = createContext(values);

interface ILocaleProvider {
  children: ReactNode;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: ILocaleProvider) {
  // values.currencyCharacter = "₹";
  return (
    <LocaleContext.Provider value={values}>{children}</LocaleContext.Provider>
  );
}

interface ITextReplacemetObject extends Object {
  [key: string]: any;
}
export function rt(text: string, object: ITextReplacemetObject) {
  const regex = /\${(.*?)}/g;

  const replacedString = text.replace(regex, (match, key) => {
    // Extract the key inside ${...}
    const replacementKey = key.trim();

    // Check if the replacement key exists in the replacements object
    if (object.hasOwnProperty(replacementKey)) {
      // Return the replacement value corresponding to the key
      return object[replacementKey];
    } else {
      // If the key doesn't exist in replacements, return the original match
      return match;
    }
  });
  return replacedString;
}
