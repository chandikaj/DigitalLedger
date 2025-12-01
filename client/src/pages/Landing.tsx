import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Brain, 
  Users, 
  BookOpen, 
  Podcast, 
  MessageSquare, 
  TrendingUp,
  Shield,
  Award,
  Mic,
  PlayCircle,
  Heart,
  Share,
  MessageCircle,
  ExternalLink
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

  // Fetch menu settings to control section visibility
  const { data: menuSettings = [] } = useQuery<MenuSetting[]>({
    queryKey: ["/api/menu-settings"],
  });

  // Helper function to check if a section should be visible
  const isSectionVisible = (key: string): boolean => {
    const setting = menuSettings.find(s => s.menuKey === key);
    return setting ? setting.isVisible : true; // Show by default if setting not found
  };
  
  const { data: allPodcasts } = useQuery({
    queryKey: ["/api/podcasts"],
    queryFn: () => fetch("/api/podcasts?limit=50").then(res => res.json()),
  });

  const { data: allNews = [] } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => fetch("/api/news?limit=50").then(res => res.json()),
  });

  const featuredNews = allNews.filter((article: any) => article.isFeatured);
  const newsArticles = featuredNews.length > 0 ? featuredNews.slice(0, 3) : allNews.slice(0, 3);

  const featuredPodcasts = allPodcasts?.filter((podcast: any) => podcast.isFeatured) || [];
  const latestPodcasts = featuredPodcasts.length > 0 ? featuredPodcasts.slice(0, 3) : (allPodcasts?.slice(0, 3) || []);

  const { data: user } = useQuery({ queryKey: ["/api/auth/user"] });

  // Get like counts from localStorage (only for anonymous users)
  const getLocalArticleLikeCount = (articleId: string): number => {
    const likeCounts = JSON.parse(localStorage.getItem('articleLikeCounts') || '{}');
    return likeCounts[articleId] || 0;
  };

  const getLocalPodcastLikeCount = (podcastId: string): number => {
    const likeCounts = JSON.parse(localStorage.getItem('podcastLikeCounts') || '{}');
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
      return await apiRequest(`/api/news/${articleId}/like`, 'POST');
    },
    onSuccess: (response, articleId) => {
      // Only update localStorage for anonymous users
      if (response.anonymous) {
        const likeCounts = JSON.parse(localStorage.getItem('articleLikeCounts') || '{}');
        likeCounts[articleId] = (likeCounts[articleId] || 0) + 1;
        localStorage.setItem('articleLikeCounts', JSON.stringify(likeCounts));
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
      return await apiRequest(`/api/podcasts/${podcastId}/like`, 'POST');
    },
    onSuccess: (response, podcastId) => {
      // Only update localStorage for anonymous users
      if (response.anonymous) {
        const likeCounts = JSON.parse(localStorage.getItem('podcastLikeCounts') || '{}');
        likeCounts[podcastId] = (likeCounts[podcastId] || 0) + 1;
        localStorage.setItem('podcastLikeCounts', JSON.stringify(likeCounts));
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
      description: "Share experiences and best practices for implementing AI solutions in accounting workflows.",
      discussions: "1,247 discussions",
      latest: "2 minutes ago",
      color: "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      name: "Regulatory Compliance",
      description: "Navigate evolving regulations and compliance requirements for AI in financial reporting.",
      discussions: "856 discussions",
      latest: "18 minutes ago",
      color: "bg-accent/10 text-accent",
    },
    {
      icon: <Award className="h-6 w-6" />,
      name: "Learning & Development",
      description: "Career growth, certification paths, and skill development in AI accounting technologies.",
      discussions: "624 discussions",
      latest: "35 minutes ago",
      color: "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient py-16 text-white" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="hero-title">
              Welcome to <span className="text-yellow-300">The Digital Ledger</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8" data-testid="hero-subtitle">
              Where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead.
              <br className="hidden md:block" />
              Join a growing community focused on AI, finance transformation, and modern corporate finance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-gray-100"
                onClick={() => setLocation("/login")}
                data-testid="button-join-community"
              >
                Join Community
              </Button>
            </div>
            <p className="text-xl md:text-2xl text-blue-100 mt-4" data-testid="text-no-spam">
              No spam, just powerful insights!
            </p>
          </div>
        </div>
      </section>

      {/* News Section - only show if news tab is visible */}
      {isSectionVisible('news') && (
      <section className="py-16 bg-white dark:bg-dark-bg" data-testid="news-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="news-title">
              Latest Corporate Finance and Accounting News
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
              Stay updated with curated insights from trusted sources, academic journals, and industry leaders
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article: any) => (
              <Link key={article.id} href={`/news/${article.id}`}>
                <Card className="hover:shadow-lg transition-shadow duration-300 relative" data-testid={`news-card-${article.id}`}>
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg cursor-pointer">
                    <img 
                      src={article.imageUrl || "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"} 
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {article.categories && article.categories.length > 0 ? (
                        article.categories.map((cat: any) => (
                          <Badge 
                            key={cat.id}
                            variant="secondary" 
                            className="capitalize"
                            style={{ backgroundColor: cat.color + '20', color: cat.color }}
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
                      <span className="text-gray-500 dark:text-gray-400 text-sm" data-testid={`time-${article.id}`}>
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 hover:text-primary dark:hover:text-ai-teal transition-colors cursor-pointer" data-testid={`title-${article.id}`}>
                      {article.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`excerpt-${article.id}`}>
                      {article.excerpt || article.content?.substring(0, 150) + '...'}
                    </p>
                    
                    {article.sourceName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4" data-testid={`source-${article.id}`}>
                        Source: {article.sourceName}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <button
                          className="flex items-center space-x-1 transition-colors hover:text-red-500"
                          onClick={(e) => handleArticleLike(e, article.id)}
                          data-testid={`like-${article.id}`}
                        >
                          <Heart className="h-4 w-4" />
                          <span>{getOptimisticArticleLikeCount(article)}</span>
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
                      
                      <span className="text-sm font-medium text-primary dark:text-ai-teal cursor-pointer">
                        Read More →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
      {isSectionVisible('podcasts') && (
      <section className="py-16 bg-gray-50 dark:bg-gray-900" data-testid="podcast-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="podcast-title">
              Digital Ledger Podcast Hub
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
              Listen to expert interviews, industry insights, and practical discussions about the future of Corporate Finance and Accounting
            </p>
          </div>

          {/* Latest 3 Podcasts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestPodcasts && latestPodcasts.length > 0 ? (
              latestPodcasts.map((podcast: any, index: number) => (
                <Card key={podcast.id} className="hover:shadow-md transition-shadow" data-testid={`podcast-card-${index}`}>
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img 
                      src={podcast.imageUrl || "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"} 
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" data-testid={`episode-badge-${index}`}>
                        Episode {podcast.episodeNumber}
                      </Badge>
                      <span className="text-gray-500 dark:text-gray-400 text-sm" data-testid={`duration-${index}`}>
                        {podcast.duration}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2" data-testid={`podcast-title-${index}`}>
                      {podcast.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 text-sm" data-testid={`podcast-description-${index}`}>
                      {podcast.description}
                    </p>
                    
                    {/* Listen Now Button */}
                    {podcast.audioUrl && (
                      <div className="mb-4">
                        <Button 
                          asChild
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                          data-testid={`button-listen-now-${index}`}
                        >
                          <a 
                            href={podcast.audioUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-2"
                          >
                            <PlayCircle className="h-5 w-5" />
                            <span>Listen Now</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    )}
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Mic className="h-4 w-4 text-primary dark:text-ai-teal" />
                          <span className="text-gray-600 dark:text-gray-300">{podcast.hostName}</span>
                        </div>
                      </div>
                      {podcast.guestName && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Guest: {podcast.guestName}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-3">
                        <button className="flex items-center space-x-1 hover:text-primary dark:hover:text-ai-teal">
                          <PlayCircle className="h-4 w-4" />
                          <span>{podcast.playCount || 0} plays</span>
                        </button>
                        <button 
                          className="flex items-center space-x-1 transition-colors hover:text-red-500"
                          onClick={(e) => handlePodcastLike(e, podcast.id)}
                          data-testid={`like-podcast-${index}`}
                        >
                          <Heart className="h-4 w-4" />
                          <span>{getOptimisticPodcastLikeCount(podcast)}</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Podcast className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No podcast episodes available yet.</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              className="bg-primary hover:bg-blue-700 text-white"
              onClick={() => setLocation("/podcasts")}
              data-testid="button-view-all-podcasts"
            >
              View All Episodes
            </Button>
          </div>
        </div>
      </section>
      )}

      {/* Forum Section - only show if forums tab is visible */}
      {isSectionVisible('forums') && (
      <section className="py-16 bg-white dark:bg-dark-bg" data-testid="forum-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="forum-title">
              Community Forums
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
              Engage with fellow professionals, share insights, and get answers to your AI accounting challenges
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forumCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow" data-testid={`forum-category-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${category.color}`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`category-name-${index}`}>
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`category-discussions-${index}`}>
                        {category.discussions}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4" data-testid={`category-description-${index}`}>
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400" data-testid={`category-latest-${index}`}>
                      Latest: {category.latest}
                    </span>
                    <span className="text-primary dark:text-ai-teal font-medium" data-testid={`category-join-${index}`}>
                      Join Discussion →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA Section */}
      <section className="py-16 cta-gradient text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" data-testid="cta-title">
            Ready to Transform Your Accounting Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-8" data-testid="cta-description">
            Join thousands of professionals already using AI to revolutionize their accounting workflows
          </p>
          <Button 
            size="lg"
            className="bg-white text-primary hover:bg-gray-100"
            onClick={() => setLocation("/login")}
            data-testid="button-get-started"
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </Layout>
  );
}
