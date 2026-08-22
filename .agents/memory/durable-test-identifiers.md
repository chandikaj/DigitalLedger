---
name: Durable test identifiers
description: How to create temporary test identities when CodeExecution blocks clock and UUID helpers.
---

CodeExecution in this project can reject both `crypto.randomUUID()` and
`Date.now()` in durable code. For temporary browser-test users or records, use a
fixed, unmistakably test-only identifier and delete any stale match before
creation, then delete it again after the test.

**Why:** Attempts to generate a temporary editor suffix with both helpers failed
before any database write. A fixed test identity with explicit pre/post cleanup
made the test deterministic and left no residual data.

**How to apply:** Use this only for short-lived development test data. Never use
fixed credentials or identifiers for production accounts, secrets, or runtime
application behavior.