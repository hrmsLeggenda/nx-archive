# NX Archive development

Use a feature branch and PR. Read README before editing. Keep sources in this repository.

- Node 22+; install with `npm ci`. Run `npm test` and `npm run build` before delivery.
- Content: Chinese Markdown under docs/games/<slug>/; add catalog entry in docs/data/games.json.
- Do not invent game facts. Record platform, version, sources, and spoiler level for real guides.
- Demo map must stay clearly labeled fictional until replaced with verified and authorized assets.
- Map code must support SSR, keyboard access, storage failures, and GitHub Pages base path.
- Never commit node_modules, generated output, or secrets.
- CI verifies PRs; Pages deployment runs on main. Keep production publishing on the agreed workflow.
