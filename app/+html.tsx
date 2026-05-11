// Web-only root HTML for static / server output (`expo.web.output` = "static" | "server").
// Default Metro web (`expo start --web`) uses `public/index.html` as the shell; keep that file in sync for SEO + favicon.
// https://docs.expo.dev/router/reference/static-rendering/#root-html

import type { ReactNode } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const SITE_NAME = "STARS";
const TITLE = "STARS — Smart attendance for MUT";
const DESCRIPTION =
  "STARS is Mangosuthu University of Technology’s attendance platform for students and lecturers: modules, live sessions, rotating codes, and one-shot GPS checks — built for clarity and scale.";

/** Set in `.env` for production: `EXPO_PUBLIC_SITE_URL=https://your-domain.example` (no trailing slash). */
const SITE_URL = typeof process !== "undefined" ? process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, "") : "";

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="keywords" content="MUT, Mangosuthu University of Technology, attendance, STARS, students, lecturers, university" />
        <meta name="author" content="MUT Innovation Lab" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#006281" />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        {SITE_URL ? <meta property="og:url" content={SITE_URL} /> : null}

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />

        {SITE_URL ? <link rel="canonical" href={SITE_URL} /> : null}

        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
