import {
  Dialog,
  DialogContent,
  DialogHeader,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Get it Wednesday
          </DialogTitle>
          <DialogDescription className="text-center">
            Two articles and one podcast episode, every Wednesday morning.
          </DialogDescription>
        </DialogHeader>
        {open && !BEEHIIV_FORM_ID && (
          <p className="text-center text-sm text-muted-foreground py-8">
            The signup form isn't configured yet. Please try again later.
          </p>
        )}
        {open && BEEHIIV_FORM_ID && (
          <iframe
            src={formSrc}
            title="The Digital Ledger Newsletter"
            className="beehiiv-embed w-full border-0"
            style={{ height: 320 }}
            scrolling="no"
            data-testid="beehiiv-form-iframe"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
