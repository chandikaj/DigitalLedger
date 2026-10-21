import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { trackPopupOpen, trackPopupUpdate, type PopupTrigger } from "@/lib/tracking";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Milestones = { emailEntered?: boolean; subscribed?: boolean; details?: Record<string, unknown> };

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
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ alreadySubscribed: boolean } | null>(null);

  const popupEventIdRef = useRef<string | null>(null);
  const emailEnteredSentRef = useRef(false);
  // Milestones observed before the popup event ID arrives are queued here
  const pendingUpdatesRef = useRef<Milestones | null>(null);

  const recordPopupMilestone = (updates: Milestones) => {
    if (popupEventIdRef.current) {
      trackPopupUpdate(popupEventIdRef.current, updates);
    } else {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    }
  };

  useEffect(() => {
    if (!open) {
      setEmail("");
      setError("");
      setDone(null);
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
  }, [open]);

  const subscribeMutation = useMutation({
    mutationFn: async (value: string): Promise<{ alreadySubscribed?: boolean }> =>
      apiRequest("/api/subscribers", "POST", { email: value }),
    onSuccess: (res) => {
      recordPopupMilestone({ emailEntered: true, subscribed: true });
      setDone({ alreadySubscribed: !!res?.alreadySubscribed });
    },
    onError: (err: Error) => {
      // apiRequest errors look like `400: {"message":"..."}`
      let message = "Something went wrong. Please try again.";
      try {
        const body = JSON.parse(err.message.replace(/^\d+:\s*/, ""));
        if (typeof body?.message === "string") message = body.message;
      } catch {
        // keep the generic message
      }
      setError(message);
    },
  });

  const handleChange = (value: string) => {
    setEmail(value);
    if (error) setError("");
    if (!emailEnteredSentRef.current && value.trim()) {
      emailEnteredSentRef.current = true;
      recordPopupMilestone({ emailEntered: true });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address");
      return;
    }
    subscribeMutation.mutate(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md p-0 overflow-hidden" data-testid="subscribe-dialog">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-teal-500" />

        {done ? (
          <div className="px-6 pb-8 pt-6 text-center sm:px-8">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <DialogTitle className="text-xl font-semibold">
              {done.alreadySubscribed ? "You're already on the list" : "You're in!"}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-relaxed">
              {done.alreadySubscribed ? (
                <>The next issue goes to <span className="font-medium text-foreground">{email.trim()}</span> on Wednesday morning.</>
              ) : (
                <>
                  A welcome email is on its way to{" "}
                  <span className="font-medium text-foreground">{email.trim()}</span>. If you don't see it,
                  check your spam or promotions folder.
                </>
              )}
            </DialogDescription>
            <Button className="mt-6 w-full" onClick={() => onOpenChange(false)} data-testid="button-subscribe-done">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pb-8 pt-6 sm:px-8" noValidate>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-semibold">Get The Digital Ledger</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed">
              Two articles and one podcast on AI in finance &amp; accounting, every Wednesday morning. Free.
            </DialogDescription>

            <div className="mt-6 space-y-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                aria-label="Email address"
                aria-invalid={!!error}
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                data-testid="input-subscribe-email"
              />
              {error && (
                <p className="text-sm text-red-500" role="alert" data-testid="text-subscribe-error">
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-4 w-full"
              disabled={subscribeMutation.isPending}
              data-testid="button-subscribe-submit"
            >
              {subscribeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subscribing…
                </>
              ) : (
                "Subscribe free"
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No spam. Unsubscribe anytime with one click.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
