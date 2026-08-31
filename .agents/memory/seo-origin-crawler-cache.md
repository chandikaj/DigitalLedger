---
name: SEO origin and crawler caching
description: Durable canonical-origin and crawler-cache policy for public SEO output.
---

All server- and client-generated canonical, Open Graph, Twitter, share, and
structured-data URLs must use the same verified HTTPS public origin. Do not
derive these URLs from request Host headers, browser location, or development
deployment aliases.

**Why:** Alternate hosts create duplicate canonical identities, while untrusted
hosts can poison crawler output.

**How to apply:** When adding SEO output on either side of the app, use the
configured public-origin path and retain a credential-free HTTPS validation
step.

Crawler-rendered HTML that includes database content must use `no-store` unless
there is a guaranteed cache purge on every publish, unpublish, archive, and
delete transition.

**Why:** A shared cached crawler response can be served to ordinary visitors or
continue exposing content after it becomes private.

**How to apply:** Keep mutable crawler detail and listing responses uncached.
Long-lived immutable caching remains appropriate for fingerprinted static
assets.