---
name: Secure upload capabilities
description: Security invariants for authenticated uploads that may later become public.
---

Treat every upload target as a short-lived, one-use capability bound to the authenticated owner and intended media purpose. Enforce MIME type and byte limits while streaming the actual storage write, and use atomic create-only storage preconditions so a consumed target cannot overwrite a published object.

**Why:** Publication-time ACL and metadata checks happen too late to prevent abandoned oversized uploads, cross-user path promotion, or replay-based asset tampering. Issuance-only rate limits also do not constrain repeated PUTs to one target.

**How to apply:** Any future upload route must authenticate both issuance and write, bind owner/purpose/expiry cryptographically or in durable state, limit actual PUT requests and bytes, delete failed partials, and revalidate before making an object public. Use shared counters/leases when deployments scale beyond one process.