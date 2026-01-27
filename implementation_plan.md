# Fix Vercel Deployment Structure

## Goal
Resolve `rootDir` conflicts preventing Vercel from compiling the project correctly. The `api/` folder (Vercel entry point) is currently outside the `src/` folder (TS root), triggering build errors.

## Changes

### 1. `tsconfig.json`
- Change `rootDir` from `./src` to `.` (project root).
- Ensure `include` contains both `src/**/*` and `api/**/*`.
- This ensures `api/index.ts` is part of the program and checked.

### 2. `package.json`
- Update `main` to `dist/src/server.js` (was `dist/server.js`).
- Update `scripts.start` to `node dist/src/server.js`.
- Update `scripts.dev` to watch correct path (no change needed as it watches `src/server.ts`).

### 3. Verification
- Run `npm run build` locally.
- Verify `dist/` contains `src/` folder.
- Deploy to Vercel.

## Verification Plan
### Automated Tests
- `npm run build` must exit with code 0.
- Check file existence: `dist/src/server.js` and `dist/src/app.js`.

### Deployment
- Run `vercel --prod` and confirm success.
