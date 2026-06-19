# FileSplit

A file splitting and sharing system. Users upload a file, it gets split into 1MB chunks with individual links, and a zero-dependency JS embed snippet is generated for adding a download button to any site.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/file-splitter run dev` — run the frontend (port 25417)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Multer (multipart uploads)
- File storage: Disk-based (no database needed)
- Frontend: React + Vite, Wouter, TanStack Query, shadcn/ui
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract source of truth
- `artifacts/api-server/src/routes/files/index.ts` — file upload/list/delete/chunk routes
- `artifacts/api-server/src/lib/fileStore.ts` — file storage utilities + snippet generator
- `artifacts/api-server/uploads/` — uploaded file chunks + metadata (one dir per fileId)
- `artifacts/file-splitter/src/pages/` — Upload, Library, FileDetail pages
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas

## Architecture decisions

- No database: file metadata is stored as `meta.json` in each file's directory alongside the chunk `.bin` files.
- Chunk size: 1MB (1,048,576 bytes) — stored as `chunk_0.bin`, `chunk_1.bin`, etc.
- File upload uses plain `fetch` with FormData on the frontend (not a generated hook) because multipart/form-data is not well-suited to Orval codegen.
- JS snippet is a self-contained IIFE: fetches all chunks in parallel using `Promise.all`, assembles them into a `Blob`, and triggers an `<a>` download — zero dependencies.
- The snippet auto-attaches to any DOM element with `data-filesplit="<fileId>"` attribute.

## Product

- Upload any file (up to 500MB) via drag & drop or file picker
- File is split into 1MB chunks, each accessible at its own URL
- JS embed snippet generated for each file — paste into any website to add a download button
- File library lists all uploads with size, date, and chunk count
- Individual chunk links are copyable per row

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing routes/fileStore, restart the API server workflow to pick up changes.
- `CHUNK_SIZE` is defined in `fileStore.ts` — changing it only affects newly uploaded files; existing files keep their original chunk size stored in `meta.json`.
- The `getBaseUrl` function in the file routes uses `x-forwarded-proto` to detect HTTPS through the Replit proxy — this ensures chunk URLs in `meta.json` use `https://` in production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
