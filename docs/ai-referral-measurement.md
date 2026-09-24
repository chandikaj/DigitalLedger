# AI referral measurement

The frontend records an `ai_referral_visit` Google Analytics event when the
browser's referrer host matches the allowlist for ChatGPT, Perplexity, Claude,
Copilot, or Gemini. The event is deduplicated per browser session and sends only
the `referral_source` provider value as an app-defined custom parameter. The app
does not add a full URL, query string, account data, or other personal data to
that custom event payload. Google Analytics automatically adds its own standard
page, session, and referrer context when it processes events, so this mechanism
must not be described as URL-free analytics.

The app currently has no separate analytics-consent preference or consent
banner. Global Privacy Control and Do Not Track signals suppress both the base
Google Analytics configuration/script load and this custom event. This is a
signal-based safeguard, not a user-facing consent mechanism.

In Google Analytics 4, event totals appear under **Reports → Engagement →
Events → ai_referral_visit**. To report the provider breakdown, register the
event-scoped `referral_source` parameter as a custom dimension under **Admin →
Custom definitions**, then use that dimension in an Exploration. GA only
collects visits where the browser supplied a recognized referrer; this does not
measure AI impressions, citations, or referrals whose referrer was omitted.