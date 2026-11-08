/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module "virtual:locale-keys" {
  const keys: readonly string[];
  export default keys;
}

declare module "pdfmake/build/pdfmake.min.js" {
  const pdfMake: {
    addFonts(
      fonts: Record<
        string,
        { normal: string; bold: string; italics: string; bolditalics: string }
      >,
    ): void;
    createPdf(definition: Record<string, unknown>): {
      getBlob(): Promise<Blob>;
    };
  };
  export default pdfMake;
}
