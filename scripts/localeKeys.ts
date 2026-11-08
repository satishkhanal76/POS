import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

/** Collect text references in memory; no generated registry is written. */
export async function collectLocaleKeys(root: string): Promise<string[]> {
  const keys = new Set<string>();
  const isKey = (value: string) => /^[A-Z][A-Z0-9_]*$/.test(value);
  const add = (value: string) => {
    if (isKey(value)) keys.add(value);
  };
  const keyFields = new Set([
    "localeKey",
    "label",
    "labelKey",
    "title",
    "description",
    "help",
    "note",
    "emptyTitle",
    "emptyDescription",
  ]);

  function strings(node: ts.Node) {
    if (ts.isConditionalExpression(node)) {
      strings(node.whenTrue);
      strings(node.whenFalse);
    } else if (ts.isStringLiteralLike(node)) add(node.text);
    else ts.forEachChild(node, strings);
  }
  async function scan(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await scan(file);
        continue;
      }
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(
        file,
        await readFile(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ["t", "translate", "getLocaleText", "LocaleValidationError"].includes(
            node.expression.text,
          ) &&
          node.arguments[0]
        )
          strings(node.arguments[0]);
        if (
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "LocaleValidationError" &&
          node.arguments?.[0]
        )
          strings(node.arguments[0]);
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ["text", "messages", "locale", "english", "englishMessages"].includes(
            node.expression.text,
          )
        )
          add(node.name.text);
        if (
          ts.isElementAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ["text", "messages", "locale", "english"].includes(
            node.expression.text,
          ) &&
          ts.isStringLiteralLike(node.argumentExpression)
        )
          add(node.argumentExpression.text);
        if (
          ts.isPropertyAssignment(node) &&
          keyFields.has(node.name.getText(source).replace(/["']/g, ""))
        )
          strings(node.initializer);
        if (
          ts.isJsxAttribute(node) &&
          keyFields.has(node.name.getText(source)) &&
          node.initializer
        )
          strings(node.initializer);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  await scan(path.join(root, "src"));
  for (const file of ["Text_EN.json", "Text_Nepali.json"]) {
    const dictionary = JSON.parse(
      await readFile(path.join(root, "src/data", file), "utf8"),
    );
    Object.keys(dictionary).forEach(add);
  }
  return [...keys].sort();
}
