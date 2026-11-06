import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import nepali from "../src/data/Text_Nepali.json";
import { validateCustomLocale } from "../src/localization/locale";

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? sourceFiles(path.join(directory, entry.name))
        : Promise.resolve(
            entry.name.endsWith(".tsx")
              ? [path.join(directory, entry.name)]
              : [],
          ),
    ),
  );
  return nested.flat();
}

test("built-in Nepali translations preserve the English interpolation placeholders", () => {
  assert.doesNotThrow(() => validateCustomLocale(nepali));
});
test("component JSX keeps visible copy in the locale dictionary", async () => {
  const root = fileURLToPath(new URL("../src", import.meta.url));
  const hardcoded: string[] = [];
  for (const file of await sourceFiles(root)) {
    const source = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) {
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        hardcoded.push(
          `${path.relative(root, file)}:${line}: ${node.text.trim()}`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(
    hardcoded,
    [],
    `Move visible JSX text to Text_EN.json:\n${hardcoded.join("\n")}`,
  );
});
