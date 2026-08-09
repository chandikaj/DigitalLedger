import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";

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
  /** Podcast episode ID for engagement tracking */
  episodeId?: string | null;
}

export function VideoPlayerDialog({ open, onOpenChange, videoId, title, onSubscribe, episodeId }: VideoPlayerDialogProps) {
  // Track watch time while the player dialog is open
  useEngagementTracking("podcast", episodeId ?? null, open && !!videoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 border-0 overflow-hidden [&>button]:hidden" data-testid="video-player-dialog">
        <DialogTitle className="sr-only" data-testid="video-player-title">
          {title || "Video player"}
        </DialogTitle>
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
        {onSubscribe && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#F1EDE4] px-4 py-3 text-[#1B2A41]"
            data-testid="video-promo-banner"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">One episode a week. That's this podcast.</p>
              <p className="text-xs opacity-80 leading-snug">
                The Digital Ledger delivers it alongside two articles, every Wednesday morning.
              </p>
            </div>
            <button
              onClick={onSubscribe}
              className="shrink-0 rounded-md bg-[#1B2A41] px-3 py-1.5 text-xs font-semibold text-[#F1EDE4] hover:opacity-90 transition-opacity"
              data-testid="video-promo-subscribe"
            >
              Get it Wednesday
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
