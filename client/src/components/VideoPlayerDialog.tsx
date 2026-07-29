import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/")[1];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const match = parsed.pathname.match(/^\/(embed|shorts|live|v)\/([^/?]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string | null;
  title?: string;
  onSubscribe?: () => void;
}

export function VideoPlayerDialog({ open, onOpenChange, videoId, title, onSubscribe }: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 border-0 overflow-hidden [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-black/60 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-black/80" data-testid="video-player-dialog">
        <DialogTitle className="sr-only" data-testid="video-player-title">
          {title || "Video player"}
        </DialogTitle>
        {onSubscribe && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-primary px-4 py-3 pr-12 text-primary-foreground"
            data-testid="video-promo-banner"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">One episode a week. That's this podcast.</p>
              <p className="text-xs opacity-90 leading-snug">
                The Digital Ledger delivers it alongside two articles, every Wednesday morning.
              </p>
            </div>
            <button
              onClick={onSubscribe}
              className="shrink-0 rounded-md bg-primary-foreground px-3 py-1.5 text-xs font-semibold text-primary hover:opacity-90 transition-opacity"
              data-testid="video-promo-subscribe"
            >
              Get it Wednesday
            </button>
          </div>
        )}
        <div className="aspect-video w-full bg-black">
          {open && videoId && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
              title={title || "Video player"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              data-testid="video-player-iframe"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
