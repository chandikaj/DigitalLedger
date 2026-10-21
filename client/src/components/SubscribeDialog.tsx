import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getUtmSearch } from "@/lib/utm";
import { trackPopupOpen, trackPopupUpdate, type PopupTrigger } from "@/lib/tracking";

const BEEHIIV_FORM_ID = import.meta.env.VITE_BEEHIIV_FORM_ID;
const BEEHIIV_ORIGIN = "https://subscribe-forms.beehiiv.com";
const FALLBACK_HEIGHT = 360;

function showBeehiivToast(payload: { templateString?: string } | undefined) {
  if (!payload?.templateString) return;
  try {
    const clean = DOMPurify.sanitize(payload.templateString, {
      ADD_TAGS: ["style"],
      ADD_ATTR: ["id", "style", "class"],
    });
    const doc = new DOMParser().parseFromString(clean, "text/html");
    const frag = document.createDocumentFragment();
    Array.from(doc.body.childNodes).forEach((n) => frag.appendChild(n.cloneNode(true)));
    const toast = frag.querySelector<HTMLElement>("#beehiiv-toast");
    if (toast) toast.style.zIndex = "2147483647";
    document.body.appendChild(frag);
    setTimeout(() => {
      document.querySelector("#beehiiv-toast")?.remove();
    }, 5000);
  } catch {
    // noop
  }
}

export function SubscribeDialog({
  open,
  onOpenChange,
  trigger = "other",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How this popup was opened, for analytics */
  trigger?: PopupTrigger;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const popupEventIdRef = useRef<string | null>(null);
  const emailEnteredSentRef = useRef(false);
  // Milestones observed before the popup event ID arrives are queued here
  const pendingUpdatesRef = useRef<{ emailEntered?: boolean; subscribed?: boolean; details?: Record<string, unknown> } | null>(null);

  const recordPopupMilestone = (updates: { emailEntered?: boolean; subscribed?: boolean; details?: Record<string, unknown> }) => {
    if (popupEventIdRef.current) {
      trackPopupUpdate(popupEventIdRef.current, updates);
    } else {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    }
  };
  const [height, setHeight] = useState<string | number>(FALLBACK_HEIGHT);
  const [width, setWidth] = useState<string | number | undefined>(undefined);
  const [radius, setRadius] = useState<string | undefined>(undefined);
  const [sized, setSized] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!open) {
      setHeight(FALLBACK_HEIGHT);
      setWidth(undefined);
      setRadius(undefined);
      setSized(false);
      setRevealed(false);
      return;
    }

    // Log popup shown (analytics; never blocks the UI)
    popupEventIdRef.current = null;
    emailEnteredSentRef.current = false;
    pendingUpdatesRef.current = null;
    trackPopupOpen(trigger, { page: window.location.pathname }).then((id) => {
      popupEventIdRef.current = id;
      // Replay milestones that arrived before the event ID resolved
      if (id && pendingUpdatesRef.current) {
        trackPopupUpdate(id, pendingUpdatesRef.current);
        pendingUpdatesRef.current = null;
      }
    });

    const revealTimer = setTimeout(() => setRevealed(true), 6000);

    const onMessage = (e: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || e.source !== iframe.contentWindow) return;
      if (e.origin !== BEEHIIV_ORIGIN) return;
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "beehiiv:child-loaded") {
        iframe.contentWindow?.postMessage({ type: "beehiiv:parent-loaded" }, BEEHIIV_ORIGIN);
      } else if (msg.type === "beehiiv:styles" || msg.type === "beehiiv:challenge") {
        if (msg.payload?.height) {
          setHeight(msg.payload.height);
          setSized(true);
          requestAnimationFrame(() => setRevealed(true));
        }
        if (msg.payload?.width) setWidth(msg.payload.width);
        if (msg.type === "beehiiv:styles" && msg.payload?.borderRadius) {
          setRadius(msg.payload.borderRadius);
        }
        // A challenge appears when the visitor submits the form — the best
        // observable signal that an email was entered (iframe is cross-origin)
        if (msg.type === "beehiiv:challenge" && !emailEnteredSentRef.current) {
          emailEnteredSentRef.current = true;
          recordPopupMilestone({ emailEntered: true });
        }
      } else if (msg.type === "beehiiv:challenge-resolved") {
        iframe.contentWindow?.postMessage({ type: "beehiiv:resize" }, BEEHIIV_ORIGIN);
      } else if (msg.type === "beehiiv:success-toast") {
        recordPopupMilestone({
          emailEntered: true,
          subscribed: true,
          details: { successMessage: msg.type },
        });
        showBeehiivToast(msg.payload);
        onOpenChange(false);
      } else if (msg.type === "beehiiv:redirect" && typeof msg.url === "string") {
        window.location.href = msg.url;
      }
    };

    // The beehiiv form is a cross-origin iframe, so we can't see typing
    // directly. When our window loses focus while the iframe is the active
    // element, the visitor clicked into the form — the earliest observable
    // signal that they're entering their email.
    const onBlur = () => {
      if (emailEnteredSentRef.current) return;
      if (document.activeElement === iframeRef.current) {
        emailEnteredSentRef.current = true;
        recordPopupMilestone({ emailEntered: true });
      }
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("blur", onBlur);
    return () => {
      clearTimeout(revealTimer);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("blur", onBlur);
    };
  }, [open, onOpenChange]);

  const formSrc = `${BEEHIIV_ORIGIN}/${BEEHIIV_FORM_ID}${getUtmSearch()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-auto max-w-[95vw] p-0 overflow-hidden bg-white dark:bg-white border-white dark:border-white [&>button]:text-neutral-700 [&>button]:dark:text-neutral-700 [&>button]:opacity-100 [&>button]:bg-white/90 [&>button]:rounded-full [&>button]:p-1 [&>button:hover]:bg-neutral-100"
        style={radius ? { borderRadius: radius } : undefined}
      >
        <DialogTitle className="sr-only">Subscribe to The Digital Ledger Newsletter</DialogTitle>
        <DialogDescription className="sr-only">
          Newsletter signup form
        </DialogDescription>
        {open && !BEEHIIV_FORM_ID && (
          <p className="text-center text-sm text-muted-foreground py-8 px-12">
            The signup form isn't configured yet. Please try again later.
          </p>
        )}
        {open && BEEHIIV_FORM_ID && (
          <div className="relative">
            {!revealed && (
              <div
                className="flex items-center justify-center"
                style={{ width: "min(24rem, 90vw)", height: 180 }}
                data-testid="beehiiv-form-loading"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={formSrc}
              title="The Digital Ledger Newsletter"
              className="beehiiv-embed border-0 block mx-auto"
              style={{
                height,
                width: width ?? "min(36rem, 95vw)",
                maxWidth: "95vw",
                maxHeight: "80vh",
                overflow: "auto",
                ...(revealed
                  ? { opacity: 1, transition: "opacity 200ms ease" }
                  : {
                      position: "absolute" as const,
                      top: 0,
                      left: 0,
                      opacity: 0,
                      pointerEvents: "none" as const,
                    }),
              }}
              scrolling={sized ? "no" : "auto"}
              data-testid="beehiiv-form-iframe"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
