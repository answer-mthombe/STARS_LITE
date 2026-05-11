# STARS

**STARS** — Smart attendance for **Mangosuthu University of Technology**, built with Expo, TypeScript, and Expo Router. The app ships with a **mock JSON / in-memory database** so flows work offline-first; Firebase can replace the same service boundaries later.

## Quick start

```bash
npm install --legacy-peer-deps
npx expo start -c
```

- **Web:** open the URL Expo prints (favicon: `assets/favicon.svg`).
- **Node:** use **20 LTS** for best compatibility with Expo SDK 52.

## Documentation

See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for the full **tech stack**, **engineering process**, routing notes, and attendance simulation overview.

## Web SEO & document head

Expo Router does **not** use a hand-written `public/index.html` for the app shell (that can break client routing). Use **`app/+html.tsx`** for `<title>`, **meta description**, Open Graph, Twitter Card, and favicon links. Copy **[.env.example](./.env.example)** to `.env` and set **`EXPO_PUBLIC_SITE_URL`** when you deploy for canonical + `og:url`.

## Brand

- Product name: **STARS** (`StarsWordmark` component).
- Footer: **Created by the MUT Innovation Lab** (`InnovationLabFooter`).

## Legacy bootstrap note

If you scaffold from zero with `create-expo-app`, align dependencies with `package.json` in this repo, then copy `app/` and `src/` as needed.
