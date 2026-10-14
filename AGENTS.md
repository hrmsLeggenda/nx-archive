# NX Archive · development

This repository now hosts a static game-guide navigation portal, not a Wiki.

- Work on a feature branch and submit a pull request.
- Node 22+: run `npm ci`, `npm test`, `npm run build`.
- Update game links and metadata in `site/games.json`. Never invent guide availability.
- External links must be absolute HTTPS URLs, open in a new tab with `rel="noopener noreferrer"`, and identify the external source.
- Use relative asset URLs for GitHub Pages (/nx-archive/) and Cloudflare Pages (/).
- No user login, Wiki editor, maps, backend publishing, tracking, scraped game artwork or committed secrets.
- Keep accessibility, responsive fallback, localStorage errors and no-JavaScript notice functional.
