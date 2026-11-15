# Hublink

Hublink is a local prototype for organizing projects, experience, evidence, and reader-specific views in a connected graph. It includes public-facing graph and resume views, an administrator workspace, GitHub repository snapshots, and a structured public context endpoint.

The application uses Next.js, TypeScript, and SQLite. Private source material, drafts, personal profile files, and database files belong under the Git-ignored `data/` directory and are not part of this repository. Public pages use only the reviewed profile content committed in `src/content/profile.ts`; local private files are not loaded into anonymous pages or APIs.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The development server listens on port `43123`. The administrator workspace is at `/admin`. Configure a local administrator password before using it on a network; the development fallback is for local use only. SQLite data is stored under `data/`.

## Checks

```bash
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Privacy boundary

Only reviewed public graph content is returned by anonymous graph and context endpoints. Private drafts and local source material are read by server-side administrator routes. Do not place personal source documents, local databases, credentials, or private configuration in tracked files.
