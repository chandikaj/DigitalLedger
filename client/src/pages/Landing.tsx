import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SubscribeDialog } from "@/components/SubscribeDialog";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PopupTrigger } from "@/lib/tracking";
import { formatArticleDate } from "@/lib/articleDate";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  Brain,
  Podcast,
  Shield,
  Award,
  PlayCircle,
  Heart,
  Share,
  MessageCircle,
} from "lucide-react";

interface MenuSetting {
  id: string;
  menuKey: string;
  menuLabel: string;
  isVisible: boolean;
  displayOrder: number;
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscribeTrigger, setSubscribeTrigger] = useState<PopupTrigger>("hero");

  const openSubscribe = (trigger: PopupTrigger) => {
    setSubscribeTrigger(trigger);
    setShowSubscribe(true);
  };

  // Fetch menu settings to control section visibility
  const { data: menuSettings = [] } = useQuery<MenuSetting[]>({
    queryKey: ["/api/menu-settings"],
  });

  // Helper function to check if a section should be visible
  const isSectionVisible = (key: string): boolean => {
    const setting = menuSettings.find((s) => s.menuKey === key);
    return setting ? setting.isVisible : true; // Show by default if setting not found
  };

  const { data: allPodcasts } = useQuery({
    queryKey: ["/api/podcasts"],
    queryFn: () => fetch("/api/podcasts?limit=3").then((res) => res.json()),
  });

  const { data: allNews = [] } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => fetch("/api/news?limit=3").then((res) => res.json()),
  });

  // Both endpoints return content in newest-first publication order.
  // The landing page intentionally ignores featured flags so these sections
  // always show the latest three published articles and podcast episodes.
  const latestArticles = allNews.slice(0, 3);
  const latestPodcasts = allPodcasts?.slice(0, 3) || [];

  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });

  // Get like counts from localStorage (only for anonymous users)
  const getLocalArticleLikeCount = (articleId: string): number => {
    const likeCounts = JSON.parse(
      localStorage.getItem("articleLikeCounts") || "{}",
    );
    return likeCounts[articleId] || 0;
  };

  const getLocalPodcastLikeCount = (podcastId: string): number => {
    const likeCounts = JSON.parse(
      localStorage.getItem("podcastLikeCounts") || "{}",
    );
    return likeCounts[podcastId] || 0;
  };

  // Calculate optimistic like counts
  const getOptimisticArticleLikeCount = (article: any) => {
    const dbCount = article.likes || 0;
    // Only add localStorage count for anonymous users (no double counting)
    if (user) {
      return dbCount; // Authenticated: database has the real count
    }
    return dbCount + getLocalArticleLikeCount(article.id); // Anonymous: add localStorage count
  };

  const getOptimisticPodcastLikeCount = (podcast: any) => {
    const dbCount = podcast.likes || 0;
    // Only add localStorage count for anonymous users (no double counting)
    if (user) {
      return dbCount; // Authenticated: database has the real count
    }
    return dbCount + getLocalPodcastLikeCount(podcast.id); // Anonymous: add localStorage count
  };

  // Like mutation for articles
  const likeArticleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      return await apiRequest(`/api/news/${articleId}/like`, "POST");
    },
    onSuccess: (response, articleId) => {
      // Only update localStorage for anonymous users
      if (response.anonymous) {
        const likeCounts = JSON.parse(
          localStorage.getItem("articleLikeCounts") || "{}",
        );
        likeCounts[articleId] = (likeCounts[articleId] || 0) + 1;
        localStorage.setItem("articleLikeCounts", JSON.stringify(likeCounts));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update like.",
        variant: "destructive",
      });
    },
  });

  // Like mutation for podcasts
  const likePodcastMutation = useMutation({
    mutationFn: async (podcastId: string) => {
      return await apiRequest(`/api/podcasts/${podcastId}/like`, "POST");
    },
    onSuccess: (response, podcastId) => {
      // Only update localStorage for anonymous users
      if (response.anonymous) {
        const likeCounts = JSON.parse(
          localStorage.getItem("podcastLikeCounts") || "{}",
        );
        likeCounts[podcastId] = (likeCounts[podcastId] || 0) + 1;
        localStorage.setItem("podcastLikeCounts", JSON.stringify(likeCounts));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update like.",
        variant: "destructive",
      });
    },
  });

  const handleArticleLike = (e: React.MouseEvent, articleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    likeArticleMutation.mutate(articleId);
  };

  const handlePodcastLike = (e: React.MouseEvent, podcastId: string) => {
    e.preventDefault();
    e.stopPropagation();
    likePodcastMutation.mutate(podcastId);
  };

  const forumCategories = [
    {
      icon: <Brain className="h-6 w-6" />,
      name: "AI Implementation",
      description:
        "Share experiences and best practices for implementing AI solutions in accounting workflows.",
      discussions: "1,247 discussions",
      latest: "2 minutes ago",
      color: "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      name: "Regulatory Compliance",
      description:
        "Navigate evolving regulations and compliance requirements for AI in financial reporting.",
      discussions: "856 discussions",
      latest: "18 minutes ago",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: <Award className="h-6 w-6" />,
      name: "Learning & Development",
      description:
        "Career growth, certification paths, and skill development in AI accounting technologies.",
      discussions: "624 discussions",
      latest: "35 minutes ago",
      color:
        "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
  ];

  return (
    <Layout>
      <SubscribeDialog open={showSubscribe} onOpenChange={setShowSubscribe} trigger={subscribeTrigger} />
      {/* Hero Section */}
      <section className="py-16 bg-[#F1EDE4]" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1
              className="text-4xl md:text-6xl font-bold mb-6 text-[#1F2A44]"
              data-testid="hero-title"
            >
              The Digital Ledger
            </h1>
            <div
              className="text-xl md:text-2xl text-[#2A2A2A] max-w-3xl mx-auto mb-3"
              data-testid="hero-subtitle"
            >
              <p className="font-bold mb-3">
                The finance industry is loud. It's also, quietly, changing
                shape.
              </p>
              <p className="mb-3">
                This is a weekly brief for the CFOs, controllers, FP&A leads,
                and accounting firm partners who can already feel it.
              </p>
              <p className="mb-3">
                Two articles and one podcast episode, every Wednesday morning.
              </p>
            </div>
            <p
              className="text-xl md:text-2xl text-[#2A2A2A] mb-3"
              data-testid="text-no-spam"
            >
              Thanks for being here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-[#1F2A44] hover:bg-[#162035] text-[#F7F4EC]"
                onClick={() => openSubscribe("hero")}
                data-testid="button-join-community"
              >
                Get it Wednesday
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News Section - only show if news tab is visible */}
      {isSectionVisible("news") && (
        <section
          className="py-16 bg-white dark:bg-dark-bg"
          data-testid="news-section"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
                data-testid="news-title"
              >
                Latest Articles
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
                Two articles a week, on what's actually shifting underneath the
                headlines.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestArticles.map((article: any, index: number) => (
                <Card
                  key={article.id}
                  className="hover:shadow-lg transition-shadow duration-300 relative"
                  data-testid={`news-card-${article.id}`}
                >
                  <Link href={`/news/${article.id}`}>
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg cursor-pointer">
                      <OptimizedImage
                        src={
                          article.imageUrl ||
                          "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                        }
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        width="800"
                        height="450"
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        {...(index === 0
                          ? ({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)
                          : {})}
                      />
                    </div>
                  </Link>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {article.categories && article.categories.length > 0 ? (
                          article.categories.map((cat: any) => (
                            <Badge
                              key={cat.id}
                              variant="secondary"
                              className="capitalize text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                              style={{
                                backgroundColor: cat.color + "20",
                              }}
                              data-testid={`category-${article.id}-${cat.slug}`}
                            >
                              {cat.name}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="secondary"
                            className="capitalize"
                            data-testid={`category-${article.id}`}
                          >
                            General
                          </Badge>
                        )}
                        <span
                          className="text-gray-500 dark:text-gray-400 text-sm"
                          data-testid={`time-${article.id}`}
                        >
                          {formatArticleDate(article)}
                        </span>
                      </div>

                      <Link href={`/news/${article.id}`}>
                        <h3
                          className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 hover:text-blue-700 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                          data-testid={`title-${article.id}`}
                        >
                          {article.title}
                        </h3>
                      </Link>

                      <p
                        className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3"
                        data-testid={`excerpt-${article.id}`}
                      >
                        {article.excerpt ||
                          article.content?.substring(0, 150) + "..."}
                      </p>

                      {article.sourceName && (
                        <p
                          className="text-sm text-gray-500 dark:text-gray-400 mb-4"
                          data-testid={`source-${article.id}`}
                        >
                          Source: {article.sourceName}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <button
                            type="button"
                            className="flex min-h-11 min-w-11 items-center justify-center space-x-1 rounded-md px-2 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={(e) => handleArticleLike(e, article.id)}
                            aria-label={`Like ${article.title}`}
                            data-testid={`like-${article.id}`}
                          >
                            <Heart className="h-4 w-4" />
                            <span>
                              {getOptimisticArticleLikeCount(article)}
                            </span>
                          </button>
                          <span className="flex items-center space-x-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{article.commentCount || 0}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Share className="h-4 w-4" />
                            <span>Share</span>
                          </span>
                        </div>

                        <Link
                          href={`/news/${article.id}`}
                          className="text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-cyan-300 dark:hover:text-cyan-200"
                        >
                          Read More →
                        </Link>
                      </div>
                    </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/news">
                <Button
                  className="bg-primary hover:bg-blue-700 text-white"
                  data-testid="button-load-more-news"
                >
                  Load More Articles
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Podcast Section - only show if podcasts tab is visible */}
      {isSectionVisible("podcasts") && (
        <section
          className="py-16 bg-gray-50 dark:bg-gray-900"
          data-testid="podcast-section"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
                data-testid="podcast-title"
              >
                Latest Podcast Episodes
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
                One podcast episode a week. Conversations on what's actually
                moving in finance.
              </p>
            </div>

            {/* Latest 3 Podcasts */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestPodcasts && latestPodcasts.length > 0 ? (
                latestPodcasts.map((podcast: any, index: number) => (
                  <Card
                    key={podcast.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    data-testid={`podcast-card-${index}`}
                    role="link"
                    tabIndex={0}
                    onClick={() => setLocation(`/podcasts/${podcast.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setLocation(`/podcasts/${podcast.id}`);
                      }
                    }}
                  >
                    <Link href={`/podcasts/${podcast.id}`}>
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <OptimizedImage
                          src={
                            podcast.imageUrl ||
                            "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                          }
                          alt={podcast.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          width="800"
                          height="450"
                          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        />
                      </div>
                    </Link>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge
                          variant="secondary"
                          data-testid={`episode-badge-${index}`}
                        >
                          Episode {podcast.episodeNumber}
                        </Badge>
                        <span
                          className="text-gray-500 dark:text-gray-400 text-sm"
                          data-testid={`duration-${index}`}
                        >
                          {podcast.duration}
                        </span>
                      </div>
                      <Link href={`/podcasts/${podcast.id}`}>
                        <h3
                          className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2"
                          data-testid={`podcast-title-${index}`}
                        >
                          {podcast.title}
                        </h3>
                      </Link>
                      <p
                        className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 text-sm"
                        data-testid={`podcast-description-${index}`}
                      >
                        {podcast.description}
                      </p>

                      {/* Listen Now Button */}
                      {podcast.audioUrl && (
                        <div className="mb-4">
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center space-x-2"
                            data-testid={`button-listen-now-${index}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setLocation(`/podcasts/${podcast.id}`);
                            }}
                          >
                            <PlayCircle className="h-5 w-5" />
                            <span>Listen Now</span>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Podcast className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No podcast episodes available yet.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center mt-12">
              <Link href="/podcasts">
                <Button
                  className="bg-primary hover:bg-blue-700 text-white"
                  data-testid="button-view-all-podcasts"
                >
                  View All Episodes
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Forum Section - only show if forums tab is visible */}
      {isSectionVisible("forums") && (
        <section
          className="py-16 bg-white dark:bg-dark-bg"
          data-testid="forum-section"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
                data-testid="forum-title"
              >
                Community Forums
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
                Engage with fellow professionals, share insights, and get
                answers to your AI accounting challenges
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forumCategories.map((category, index) => (
                <Card
                  key={index}
                  className="hover:shadow-md transition-shadow"
                  data-testid={`forum-category-${index}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${category.color}`}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h3
                          className="text-lg font-semibold text-gray-900 dark:text-white"
                          data-testid={`category-name-${index}`}
                        >
                          {category.name}
                        </h3>
                        <p
                          className="text-sm text-gray-500 dark:text-gray-400"
                          data-testid={`category-discussions-${index}`}
                        >
                          {category.discussions}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-gray-600 dark:text-gray-300 mb-4"
                      data-testid={`category-description-${index}`}
                    >
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className="text-gray-500 dark:text-gray-400"
                        data-testid={`category-latest-${index}`}
                      >
                        Latest: {category.latest}
                      </span>
                      <Link
                        href="/forums"
                        className="text-primary dark:text-ai-teal font-medium"
                        data-testid={`category-join-${index}`}
                      >
                        Join Discussion →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-[#F1EDE4]" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <p
            className="text-xl md:text-2xl text-[#2A2A2A] mb-8"
            data-testid="cta-description"
          >
            If you'd like to stay with us, our weekly brief lands every
            Wednesday morning.
          </p>
          <Button
            size="lg"
            className="bg-[#1F2A44] hover:bg-[#162035] text-[#F7F4EC]"
            onClick={() => openSubscribe("hero")}
            data-testid="button-get-started"
          >
            Get it Wednesday
          </Button>
        </div>
      </section>

    </Layout>
  );
}
