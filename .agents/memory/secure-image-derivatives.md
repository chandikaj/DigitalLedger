---
name: Secure image derivatives
description: Security and cache-correctness boundaries for responsive image optimization.
---

Image optimization must process only objects already stored by this project and
approved for public access. Never turn the optimizer into a general URL fetcher
or proxy.

**Why:** An arbitrary URL optimizer creates SSRF and bandwidth-abuse risks. Even
local images can create decompression-bomb, CPU, memory, and storage risks if
dimensions and concurrent work are unbounded.

**How to apply:** Keep fixed output widths, compressed-byte and decoded-pixel
limits, strict format decoding, metadata-stripping re-encoding, a small global
work queue, and bounded request state. Preserve generic errors for private,
missing, and malformed sources.

Immutable derivative responses must use an opaque version derived from the
source path and storage generation. The stable discovery URL must remain
uncached and redirect to the current version.

**Why:** Keying only the stored derivative by generation is insufficient if the
public URL stays unchanged; browsers and CDNs would continue serving an old
immutable response after a source replacement.

**How to apply:** Recheck the source ACL and generation before both redirecting
and serving a versioned derivative. Reject stale or forged versions.