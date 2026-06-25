---
name: Dependency audit residuals
description: Which npm-audit CVEs in this repo are intentionally left unfixed, and why, so future security tasks don't re-attempt them.
---

After a full vulnerability sweep, `npm audit --omit=dev` is 0 (production/runtime is clean). A handful of **dev/build-time only** CVEs are intentionally left:

- `vite` (high) and `esbuild` (moderate): only fix npm offers is a `vite` 5 -> 8 **major** jump.
- `drizzle-kit` + bundled `@esbuild-kit/core-utils` / `@esbuild-kit/esm-loader` (moderate): npm's only "fix" is a drizzle-kit **downgrade**.

**Why left:** `vite`/`vite.config.ts`/`server/vite.ts` setup is forbidden to modify in this project, and a 5->8 bump would break that setup. The drizzle-kit "fix" is a downgrade, not real hardening. None of these ship in the deployed runtime bundle (vite/esbuild are build tools; drizzle-kit is for `db:push` migrations), so they don't affect the published server.

**How to apply:** When a future security/audit task lists these dev-only CVEs, don't churn trying to fix them piecemeal. Only revisit as a dedicated, tested toolchain-upgrade track (Vite 8 compatibility matrix). Gate on `npm audit --omit=dev` staying at 0 instead.

**Technique that worked for transitive CVEs:** add a `package.json` `overrides` block (e.g. `uuid: ^11.1.1` cleared the `@google-cloud/storage` chain uuid/gaxios/teeny-request/retry-request) rather than downgrading the parent dep. `npm install` is blocked via the bash tool here — trigger the override by reinstalling an existing dep at its current version through the packager tool.
