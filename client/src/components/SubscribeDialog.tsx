import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getUtmSearch } from "@/lib/utm";

const BEEHIIV_FORM_ID = import.meta.env.VITE_BEEHIIV_FORM_ID;

export function SubscribeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formSrc = `https://subscribe-forms.beehiiv.com/${BEEHIIV_FORM_ID}${getUtmSearch()}`;

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
            src={formSrc}
            title="The Digital Ledger Newsletter"
            className="beehiiv-embed w-full border-0 block"
            style={{ height: 360 }}
            scrolling="no"
            data-testid="beehiiv-form-iframe"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
