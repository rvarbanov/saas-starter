# Public Global nav is session-aware (client + PKCE Sign in)

Public-site Global nav auth actions follow the client session (same `useAuth()` pattern as the home CTA): Visitors see Sign in → `/dashboard` and Sign up → `/sign-up/start`; signed-in users see Dashboard → `/dashboard` and no Sign up. Unauthenticated Sign in stays a plain `<a>` full navigation to `/dashboard` so AuthKit’s proxy can set a single PKCE cookie — not a client `Link` soft nav. Loading uses a short skeleton so signed-in users do not flash Visitor labels.
