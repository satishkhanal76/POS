# Working in this repository

- Follow the layers described in `docs/architecture.md`: components render the UI, hooks coordinate React state, controllers handle application operations, and database stores handle persistence. Share repeated behavior without combining unrelated workflows into a large generic abstraction.
- Keep user-facing text in `src/data/Text_EN.json` and `src/data/Text_Nepali.json`; use the existing locale helpers.
- Add comments explaining non-obvious constraints or decisions, especially IndexedDB transaction lifetimes, historical pricing, and retry behavior. Avoid comments that only restate the code.
- After changing supported source, configuration, or documentation files, run `npx prettier --write <changed-files>` using the repository's local Prettier. Files written by tools do not trigger the editor's format-on-save behavior. Do not rely on a manual save to format changes.
- Run checks appropriate to the change. `npm run check` covers type checks, test lint, Node tests, and the production build; browser checks are available separately. Preserve existing workspace data when testing.
