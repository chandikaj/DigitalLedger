import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getUtmSearch } from "@/lib/utm";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<string | number>(FALLBACK_HEIGHT);
  const [sized, setSized] = useState(false);

  useEffect(() => {
    if (!open) {
      setHeight(FALLBACK_HEIGHT);
      setSized(false);
      return;
    }

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
        }
      } else if (msg.type === "beehiiv:challenge-resolved") {
        iframe.contentWindow?.postMessage({ type: "beehiiv:resize" }, BEEHIIV_ORIGIN);
      } else if (msg.type === "beehiiv:success-toast") {
        showBeehiivToast(msg.payload);
        onOpenChange(false);
      } else if (msg.type === "beehiiv:redirect" && typeof msg.url === "string") {
        window.location.href = msg.url;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, onOpenChange]);

  const formSrc = `${BEEHIIV_ORIGIN}/${BEEHIIV_FORM_ID}${getUtmSearch()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Subscribe to The Digital Ledger Newsletter</DialogTitle>
        <DialogDescription className="sr-only">
          Newsletter signup form
        </DialogDescription>
        {open && !BEEHIIV_FORM_ID && (
          <p className="text-center text-sm text-muted-foreground py-8">
            The signup form isn't configured yet. Please try again later.
          </p>
        )}
        {open && BEEHIIV_FORM_ID && (
          <iframe
            ref={iframeRef}
            src={formSrc}
            title="The Digital Ledger Newsletter"
            className="beehiiv-embed w-full border-0 block"
            style={{
              height,
              maxHeight: "80vh",
              overflow: "auto",
              transition: "height 150ms ease",
            }}
            scrolling={sized ? "no" : "auto"}
            data-testid="beehiiv-form-iframe"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
