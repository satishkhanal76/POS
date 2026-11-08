import path from "node:path";
import type { Plugin } from "vite";
import { collectLocaleKeys } from "./localeKeys";

/** Expose references to the settings audit without adding a second dictionary file. */
export function localeKeysPlugin(): Plugin {
  const moduleId = "virtual:locale-keys";
  const resolvedId = `\0${moduleId}`;
  let root: string;
  let snapshot: string | undefined;
  const collect = async () => JSON.stringify(await collectLocaleKeys(root));
  return {
    name: "pos-locale-keys",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.watcher.add(path.join(root, "src"));
    },
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      snapshot = await collect();
      return `export default ${snapshot};`;
    },
    async handleHotUpdate(context) {
      if (
        !context.file.startsWith(path.join(root, "src") + path.sep) ||
        !/\.(tsx?|json)$/.test(context.file) ||
        snapshot === undefined
      )
        return;
      const next = await collect();
      if (next === snapshot) return;
      snapshot = next;
      const module = context.server.moduleGraph.getModuleById(resolvedId);
      if (!module) return;
      context.server.moduleGraph.invalidateModule(module);
      return [...context.modules, module];
    },
  };
}
