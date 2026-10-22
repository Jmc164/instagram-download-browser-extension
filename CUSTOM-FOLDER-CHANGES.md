# Instagram Downloader (Custom Folder)

A modified build of [Instagram Downloader by konka](https://github.com/TheKonka/instagram-download-browser-extension)
(MIT license, based on upstream commit `475e7ea`, version 2.4.8) that adds a **Download Folder** setting.

## What changed

- **New setting**: toolbar popup → *Save Location* → *Download Folder*.
  - Saves into that folder inside your Firefox download folder, e.g. `Instagram`.
  - Supports subfolders and `{username}`, e.g. `Instagram/{username}`.
  - Leave it blank and the extension behaves exactly like the original.
- Saves go through Firefox's `downloads` API (the only way an extension can pick a folder),
  so the manifest adds the `downloads` permission. Existing files are never overwritten;
  duplicates get `(1)`, `(2)`… appended. If saving to the folder ever fails, it falls back
  to the original save method.
- Folder and file names are cleaned of characters Firefox rejects (`: * ? " < > |`), and
  `..` segments are dropped so nothing can be written outside the download folder.
- The ZIP button respects the folder too.
- Own add-on ID (`instagram-downloader-custom-folder@local`) and name, so it can be signed and
  installed separately from the original. Declares that it collects no data.

Files touched: `src/background/folder.ts` (new), `src/background/firefox.ts`,
`src/content/utils/fn.ts`, `src/content/utils/zip.ts`, `src/content/profile.ts`,
`src/content/utils/storage.ts`, `src/constants.ts`, `src/popup/index.tsx`,
`src/manifest.firefox.json`, `package.json`, `esbuild.config.mjs` (adds `--once`).

## Build

Requires Node.js 20+ and pnpm.

```
pnpm install
npx tsc --noEmit
node esbuild.config.mjs firefox --once
```

The built extension is in `dist/firefox/`. Zip the *contents* of that folder to get the add-on file.
