import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
}

export function VideoPlayerDialog({ open, onOpenChange, videoId, title }: VideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden" data-testid="video-player-dialog">
        <DialogHeader className="px-4 pt-4 pb-2 pr-10">
          <DialogTitle className="line-clamp-1 text-base" data-testid="video-player-title">
            {title || "Now Playing"}
          </DialogTitle>
        </DialogHeader>
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
