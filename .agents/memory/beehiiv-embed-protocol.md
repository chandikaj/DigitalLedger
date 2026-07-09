---
name: beehiiv embed protocol
description: How the beehiiv subscribe form popup communicates with the page, and how to test it
---

# beehiiv v3 embed protocol

- The beehiiv subscribe form is embedded as a direct iframe (`https://subscribe-forms.beehiiv.com/<form-id>`); their loader.js script injection does NOT render inside a shadcn Dialog.
- The success message after subscribing is NOT shown inside the iframe. The form posts a `beehiiv:success-toast` window message (payload.templateString = toast HTML) to the parent page, which must render it itself. Other messages: `beehiiv:child-loaded` (reply `beehiiv:parent-loaded`), `beehiiv:styles`/`beehiiv:challenge` (payload has height AND width, plus borderRadius/boxShadow on styles → apply all to iframe), `beehiiv:challenge-resolved` (reply `beehiiv:resize`), `beehiiv:redirect`.
- The form has a fixed width; never force the iframe to a container width or the form renders off-center. Size the iframe from the styles payload (beehiiv's official embed.js does exactly this) and let the wrapper shrink to fit.
- **Why:** any redesign of the subscribe popup must keep this postMessage handling or the success message silently disappears (the subscription itself still works).
- **Testing:** beehiiv's Cloudflare bot protection 403-blocks form submission from headless/automated browsers and plain curl (curl works with a browser User-Agent for GETs like loader.js or `/api/v3/forms/:id`). To e2e-test the success path, replay the `beehiiv:success-toast` MessageEvent (origin `https://subscribe-forms.beehiiv.com`, source = iframe.contentWindow) via page.evaluate; verify real submits manually in a real browser.
