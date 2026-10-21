---
name: AI discovery integrity
description: Truthfulness and privacy constraints for AI-facing content and metadata.
---

Keep AI search/retrieval access separate from model-training permissions. Adding search crawlers must not silently change training preferences.

**Why:** The user authorized discovery and citation improvements, not an expansion of training access.

**How to apply:** Preserve training directives when adding retrieval crawlers; apply the same public-content rules to discovery files and crawler HTML as to public APIs.

Never backfill modification dates with migration/request time or infer public credentials from account profiles. Reuse factual published content, leave missing transcripts empty, and require actual editorial input for new claims.

**Why:** Artificial freshness and invented expertise undermine the trust these improvements are intended to establish.

**How to apply:** Keep historical modification dates unknown unless supported by records; display only intended public attribution, and keep crawler and reader content consistent.