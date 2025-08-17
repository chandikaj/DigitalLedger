import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  MessageSquare, 
  BookOpen, 
  Headphones,
  Users,
  BarChart3,
  Clock,
  Star,
  Heart,
  MessageCircle,
  Share
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  const { data: news } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => fetch("/api/news?limit=3").then(res => res.json()),
  });

  const { data: discussions } = useQuery({
    queryKey: ["/api/forum/discussions"],
    queryFn: () => fetch("/api/forum/discussions?limit=3").then(res => res.json()),
  });

  const { data: resources } = useQuery({
    queryKey: ["/api/resources"],
    queryFn: () => fetch("/api/resources?limit=3").then(res => res.json()),
  });

  const { data: featuredPodcast } = useQuery({
    queryKey: ["/api/podcasts/featured"],
    queryFn: () => fetch("/api/podcasts/featured").then(res => res.json()),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/community/stats"],
    queryFn: () => fetch("/api/community/stats").then(res => res.json()),
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8" data-testid="welcome-section">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="welcome-title">
            Welcome back, {user?.firstName || 'Member'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300" data-testid="welcome-subtitle">
            Stay updated with the latest in AI accounting and connect with your professional community
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-members">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary dark:text-ai-teal" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.activeMembers?.toLocaleString() || "0"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-discussions">
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-secondary dark:text-ai-teal" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.discussionsThisWeek || "0"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-resources">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.resourcesShared || "0"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Resources</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-podcasts">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Headphones className="h-8 w-8 text-ai-teal" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.podcastListeners || "0"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Listeners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Latest News */}
            <section data-testid="latest-news">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-primary dark:text-ai-teal" />
                  Latest News
                </h2>
                <Link href="/news">
                  <Button variant="outline" size="sm" data-testid="button-view-all-news">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {news?.map((article: any) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow" data-testid={`news-item-${article.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <img 
                          src={article.imageUrl || "https://images.unsplash.com/photo-1551434678-e076c223a692?w=100&h=100&fit=crop"}
                          alt={article.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" data-testid={`news-category-${article.id}`}>
                              {article.category}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(article.publishedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2" data-testid={`news-title-${article.id}`}>
                            {article.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3" data-testid={`news-excerpt-${article.id}`}>
                            {article.excerpt}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Heart className="h-4 w-4" />
                              <span>{article.likes || 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="h-4 w-4" />
                              <span>0</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recent Discussions */}
            <section data-testid="recent-discussions">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <MessageSquare className="h-6 w-6 mr-2 text-primary dark:text-ai-teal" />
                  Recent Discussions
                </h2>
                <Link href="/forums">
                  <Button variant="outline" size="sm" data-testid="button-view-all-discussions">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-4">
                {discussions?.map((discussion: any) => (
                  <Card key={discussion.id} className="hover:shadow-md transition-shadow" data-testid={`discussion-item-${discussion.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarImage src={discussion.author?.profileImageUrl} />
                          <AvatarFallback>
                            {discussion.author?.firstName?.[0]}{discussion.author?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" data-testid={`discussion-category-${discussion.id}`}>
                              {discussion.category?.name}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(discussion.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2" data-testid={`discussion-title-${discussion.id}`}>
                            {discussion.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            by {discussion.author?.firstName} {discussion.author?.lastName}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>{discussion.replyCount || 0} replies</span>
                            <span>{discussion.likes || 0} likes</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Featured Podcast */}
            {featuredPodcast && (
              <Card data-testid="featured-podcast-widget">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Headphones className="h-5 w-5 mr-2 text-primary dark:text-ai-teal" />
                    Featured Podcast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <img 
                      src={featuredPodcast.imageUrl || "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&h=200&fit=crop"}
                      alt={featuredPodcast.title}
                      className="w-full h-32 rounded-lg object-cover"
                    />
                    <div>
                      <Badge variant="secondary" className="mb-2">
                        Episode {featuredPodcast.episodeNumber}
                      </Badge>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2" data-testid="featured-podcast-title">
                        {featuredPodcast.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4" data-testid="featured-podcast-description">
                        {featuredPodcast.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {featuredPodcast.duration}
                        </span>
                        <Link href="/podcasts">
                          <Button size="sm" data-testid="button-listen-podcast">
                            Listen Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card data-testid="quick-actions">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/forums">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-start-discussion">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start a Discussion
                  </Button>
                </Link>
                <Link href="/resources">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-browse-resources">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Resources
                  </Button>
                </Link>
                <Link href="/community">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-community">
                    <Users className="h-4 w-4 mr-2" />
                    View Community
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Resources */}
            <Card data-testid="recent-resources">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="h-5 w-5 mr-2 text-primary dark:text-ai-teal" />
                  Recent Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resources?.slice(0, 3).map((resource: any) => (
                    <div key={resource.id} className="flex items-start space-x-3" data-testid={`resource-item-${resource.id}`}>
                      <div className="w-2 h-2 bg-primary dark:bg-ai-teal rounded-full mt-2"></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2" data-testid={`resource-title-${resource.id}`}>
                          {resource.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                          {resource.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500">{resource.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
