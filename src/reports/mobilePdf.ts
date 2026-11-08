/** Native PDF sharing avoids hidden-frame print failures in installed mobile apps. */
export function prefersMobilePdf() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function reportPdfDefinition(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const text = (element: Element | null) => element?.textContent?.trim() ?? "";
  const title = text(document.querySelector("h1"));
  const content: Record<string, unknown>[] = [
    {
      text: title,
      fontSize: 20,
      bold: true,
      margin: [0, 0, 0, 10],
      color: "#17202b",
    },
    ...[...document.querySelectorAll("header p")].map((element) => ({
      text: text(element),
      margin: [0, 0, 0, 4],
      color: "#536171",
    })),
  ];
  for (const section of document.querySelectorAll("body > section")) {
    content.push({
      text: text(section.querySelector("h2")),
      fontSize: 13,
      bold: true,
      margin: [0, 16, 0, 7],
      headlineLevel: 1,
    });
    const headers = [...section.querySelectorAll("thead th")];
    const rows = [...section.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].flatMap((cell) => {
        const span = Number(cell.getAttribute("colspan")) || 1;
        return [
          { text: text(cell), ...(span > 1 ? { colSpan: span } : {}) },
          ...Array.from({ length: span - 1 }, () => ({})),
        ];
      }),
    );
    content.push({
      table: {
        headerRows: 1,
        widths: headers.map(() => "*"),
        body: [
          headers.map((header) => ({
            text: text(header),
            bold: true,
            fillColor: "#f1f4f7",
          })),
          ...rows,
        ],
      },
      layout: "lightHorizontalLines",
    });
  }
  content.push({
    text: text(document.querySelector("footer")),
    fontSize: 8,
    color: "#536171",
    margin: [0, 16, 0, 0],
  });
  return {
    info: { title: document.title },
    pageSize: "A4",
    pageMargins: [34, 40, 34, 40],
    defaultStyle: {
      font: "Report",
      fontSize: 9,
      lineHeight: 1.25,
      color: "#17202b",
    },
    content,
    footer: (page: number, pages: number) => ({
      text: `${page} / ${pages}`,
      alignment: "right",
      margin: [34, 0, 34, 0],
      fontSize: 8,
    }),
  };
}

export async function createMobilePdf(html: string): Promise<File> {
  const { default: pdfMake } = await import("pdfmake/build/pdfmake.min.js");
  const base = new URL(import.meta.env.BASE_URL, location.origin);
  const regular = new URL("fonts/Report-Regular.ttf", base).href;
  const bold = new URL("fonts/Report-Bold.ttf", base).href;
  pdfMake.addFonts({
    Report: { normal: regular, bold, italics: regular, bolditalics: bold },
  });
  const definition = reportPdfDefinition(html);
  const blob = await pdfMake.createPdf(definition).getBlob();
  const name =
    definition.info.title.replace(/[^\p{L}\p{N} _.-]+/gu, "-").slice(0, 140) ||
    "report";
  return new File([blob], `${name}.pdf`, { type: "application/pdf" });
}
