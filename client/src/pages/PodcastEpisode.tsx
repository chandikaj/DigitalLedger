import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Heart,
  Mail,
  Mic2,
  Pencil,
  Share2,
  UserRound,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { SubscribeDialog } from "@/components/SubscribeDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getYouTubeVideoId } from "@/components/VideoPlayerDialog";
import { useAuth } from "@/hooks/useAuth";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { useToast } from "@/hooks/use-toast";
import { formatArticleDate } from "@/lib/articleDate";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=675";

function getSafeMediaUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isDirectAudioUrl(value: string) {
  try {
    return /\.(mp3|m4a|aac|wav|ogg|oga|flac)$/i.test(
      new URL(value).pathname,
    );
  } catch {
    return false;
  }
}

function updatePodcastMetaTags(episode: any) {
  const baseUrl = window.location.origin;
  const episodeUrl = `${baseUrl}/podcasts/${episode.id}`;
  const description = (episode.description || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const imageUrl = getSafeMediaUrl(episode.imageUrl) || DEFAULT_IMAGE;

  const setMeta = (name: string, content: string, property = false) => {
    const attribute = property ? "property" : "name";
    let tag = document.querySelector(
      `meta[${attribute}="${name}"]`,
    ) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, name);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };

  document.title = `${episode.title} | The Digital Ledger Podcast`;
  setMeta("description", description);
  setMeta("og:type", "music.song", true);
  setMeta("og:url", episodeUrl, true);
  setMeta("og:title", episode.title, true);
  setMeta("og:description", description, true);
  setMeta("og:image", imageUrl, true);
  setMeta("og:site_name", "The Digital Ledger", true);
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:url", episodeUrl);
  setMeta("twitter:title", episode.title);
  setMeta("twitter:description", description);
  setMeta("twitter:image", imageUrl);

  let canonical = document.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = episodeUrl;
}

function formatDuration(duration?: string | null) {
  if (!duration) return null;
  const minutes = Number.parseInt(duration, 10);
  if (Number.isNaN(minutes) || /[a-z]/i.test(duration)) return duration;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export default function PodcastEpisode() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSubscribe, setShowSubscribe] = useState(false);

  const {
    data: episode,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/podcasts", id],
    queryFn: async () => {
      const response = await fetch(`/api/podcasts/${id}`);
      if (!response.ok) throw new Error("Podcast episode not found");
      return response.json();
    },
    enabled: !!id,
  });

  const mediaUrl = getSafeMediaUrl(episode?.audioUrl);
  const imageUrl = getSafeMediaUrl(episode?.imageUrl) || DEFAULT_IMAGE;
  const videoId = getYouTubeVideoId(mediaUrl || "");
  const hasDirectAudio = !!mediaUrl && isDirectAudioUrl(mediaUrl);
  const userRole = (user as any)?.role;
  const canEdit = userRole === "admin" || userRole === "editor";

  useEngagementTracking("podcast", id, !!episode && !!videoId);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (episode) updatePodcastMetaTags(episode);
    return () => {
      document.title =
        "The Digital Ledger | Corporate Finance & Accounting Community";
    };
  }, [episode]);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/podcasts/${id}/like`, "POST"),
    onSuccess: async (response: any) => {
      if (response.anonymous && id) {
        const counts = JSON.parse(
          localStorage.getItem("podcastLikeCounts") || "{}",
        );
        counts[id] = (counts[id] || 0) + 1;
        localStorage.setItem("podcastLikeCounts", JSON.stringify(counts));
      }
      await queryClient.invalidateQueries({
        queryKey: ["/api/podcasts", id],
      });
      toast({ title: "Thanks for liking this episode." });
    },
    onError: (mutationError: any) => {
      toast({
        title: "Unable to add your like",
        description: mutationError.message,
        variant: "destructive",
      });
    },
  });

  const localLikes =
    !user && id
      ? JSON.parse(localStorage.getItem("podcastLikeCounts") || "{}")[id] || 0
      : 0;
  const likeCount = (episode?.likes || 0) + localLikes;

  const handleShare = async () => {
    const shareData = {
      title: episode.title,
      text: episode.description || `Listen to ${episode.title}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await copyText(shareData.url);
      toast({
        title: "Podcast link copied",
        description: "You can now share this episode with anyone.",
      });
    } catch (shareError: any) {
      if (shareError?.name !== "AbortError") {
        toast({
          title: "Unable to share this episode",
          description: "Please copy the page URL from your browser.",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <main className="min-h-screen bg-white dark:bg-dark-bg">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <Skeleton className="mb-8 h-5 w-40" />
            <Skeleton className="mb-4 h-8 w-28" />
            <Skeleton className="mb-4 h-14 w-full" />
            <Skeleton className="mb-8 h-6 w-2/3" />
            <Skeleton className="aspect-video w-full rounded-2xl" />
          </div>
        </main>
      </Layout>
    );
  }

  if (error || !episode) {
    return (
      <Layout>
        <main className="min-h-[70vh] bg-white dark:bg-dark-bg">
          <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
            <Mic2 className="mx-auto mb-5 h-14 w-14 text-gray-400" />
            <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
              Podcast episode not found
            </h1>
            <p className="mb-8 text-gray-600 dark:text-gray-300">
              This episode may be unavailable or the link may be incorrect.
            </p>
            <Link href="/podcasts">
              <Button>View all podcast episodes</Button>
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  const duration = formatDuration(episode.duration);

  return (
    <Layout>
      <main className="min-h-screen bg-white dark:bg-dark-bg">
        <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/podcasts"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-primary dark:text-gray-300"
              data-testid="link-back-to-podcasts"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all podcasts
            </Link>
            {canEdit && (
              <Link href={`/podcasts/${episode.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit episode
                </Button>
              </Link>
            )}
          </div>

          <header className="mx-auto mb-8 max-w-4xl text-center">
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {episode.episodeNumber && (
                <Badge variant="secondary">
                  Episode {episode.episodeNumber}
                </Badge>
              )}
              {episode.categories?.map((category: any) => (
                <Badge
                  key={category.id}
                  style={{
                    backgroundColor: category.color || undefined,
                    color: category.color ? "#fff" : undefined,
                  }}
                >
                  {category.name}
                </Badge>
              ))}
              {canEdit && episode.status !== "published" && (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
            <h1
              className="mb-5 text-3xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-4xl lg:text-5xl"
              data-testid="podcast-episode-title"
            >
              {episode.title}
            </h1>
          </header>

          <section
            className="mb-8 overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-black/10"
            aria-label="Podcast player"
          >
            {videoId ? (
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                  title={episode.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  data-testid="podcast-video-player"
                />
              </div>
            ) : hasDirectAudio ? (
              <div className="relative flex min-h-80 items-center justify-center overflow-hidden p-6 sm:p-10">
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="relative z-10 w-full max-w-2xl rounded-xl bg-black/75 p-5 text-center backdrop-blur-sm">
                  <p className="mb-4 font-medium text-white">{episode.title}</p>
                  <audio
                    controls
                    preload="metadata"
                    src={mediaUrl}
                    className="w-full"
                    data-testid="podcast-audio-player"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </div>
            ) : (
              <div className="relative aspect-video w-full">
                <img
                  src={imageUrl}
                  alt={episode.title}
                  className="h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {mediaUrl ? (
                    <Button
                      size="lg"
                      className="bg-red-600 text-white hover:bg-red-700"
                      onClick={() =>
                        window.open(
                          mediaUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      <ExternalLink className="mr-2 h-5 w-5" />
                      Listen to this episode
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-black/70 px-4 py-2 text-white">
                      No media link is available for this episode.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="mx-auto mb-10 max-w-4xl text-center">
            {episode.description && (
              <p className="text-lg leading-8 text-gray-600 dark:text-gray-300">
                {episode.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatArticleDate(episode)}
              </span>
              {duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {duration}
                </span>
              )}
              {episode.hostName && (
                <span className="inline-flex items-center gap-1.5">
                  <Mic2 className="h-4 w-4" />
                  Hosted by {episode.hostName}
                </span>
              )}
            </div>
          </section>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              data-testid="button-like-podcast"
            >
              <Heart className="mr-2 h-4 w-4" />
              {likeCount} {likeCount === 1 ? "Like" : "Likes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              data-testid="button-share-podcast"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share episode
            </Button>
          </div>

          {(episode.guestName || episode.hostName) && (
            <Card className="mx-auto mb-10 max-w-3xl">
              <CardContent className="p-6 sm:p-8">
                <h2 className="mb-5 text-xl font-semibold text-gray-900 dark:text-white">
                  Episode details
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {episode.hostName && (
                    <div className="flex items-start gap-3">
                      <Mic2 className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Host
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {episode.hostName}
                        </p>
                      </div>
                    </div>
                  )}
                  {episode.guestName && (
                    <div className="flex items-start gap-3">
                      <UserRound className="mt-0.5 h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Guest
                        </p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {episode.guestName}
                        </p>
                        {episode.guestTitle && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {episode.guestTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <section className="rounded-2xl bg-[#F1EDE4] px-6 py-8 text-center text-[#1B2A41] sm:px-10">
            <Mail className="mx-auto mb-3 h-7 w-7" />
            <h2 className="mb-2 text-2xl font-bold">
              Get the next episode every Wednesday
            </h2>
            <p className="mx-auto mb-5 max-w-2xl">
              One podcast episode and two practical articles for finance and
              accounting leaders.
            </p>
            <Button
              className="bg-[#1B2A41] text-[#F1EDE4] hover:bg-[#263a59]"
              onClick={() => setShowSubscribe(true)}
            >
              Get it Wednesday
            </Button>
          </section>
        </article>
      </main>

      <SubscribeDialog
        open={showSubscribe}
        onOpenChange={setShowSubscribe}
        trigger="video_promo"
      />
    </Layout>
  );
}