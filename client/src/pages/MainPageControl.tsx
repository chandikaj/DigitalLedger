import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, StarOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MainPageControl() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const userRole = (user as any)?.role;
  const isAuthorized = userRole === 'editor' || userRole === 'admin';

  if (!isAuthorized) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access the Main Page Control Panel. This feature is only available to editors and administrators.
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home Page
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => fetch("/api/news?limit=50").then(res => res.json()),
  });

  const { data: podcasts = [], isLoading: podcastsLoading } = useQuery({
    queryKey: ["/api/podcasts"],
    queryFn: () => fetch("/api/podcasts?limit=50").then(res => res.json()),
  });

  const { data: discussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ["/api/forum/discussions"],
    queryFn: () => fetch("/api/forum/discussions?limit=50").then(res => res.json()),
  });

  const toggleArticleFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      return await apiRequest(`/api/news/${id}/featured`, 'PATCH', { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Success",
        description: "Article featured status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update article.",
        variant: "destructive",
      });
    },
  });

  const togglePodcastFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      return await apiRequest(`/api/podcasts/${id}/featured`, 'PATCH', { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({
        title: "Success",
        description: "Podcast featured status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update podcast.",
        variant: "destructive",
      });
    },
  });

  const toggleDiscussionFeatured = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      return await apiRequest(`/api/forum/discussions/${id}/featured`, 'PATCH', { isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      toast({
        title: "Success",
        description: "Discussion featured status updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update discussion.",
        variant: "destructive",
      });
    },
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Main Page Control Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Select which articles, podcasts, and forum discussions appear on the main page. Featured items will be shown first.
          </p>
        </div>

        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="articles" data-testid="tab-articles">
              News Articles ({articles.filter((a: any) => a.isFeatured).length} featured)
            </TabsTrigger>
            <TabsTrigger value="podcasts" data-testid="tab-podcasts">
              Podcasts ({podcasts.filter((p: any) => p.isFeatured).length} featured)
            </TabsTrigger>
            <TabsTrigger value="discussions" data-testid="tab-discussions">
              Discussions ({discussions.filter((d: any) => d.isFeatured).length} featured)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" data-testid="content-articles">
            {articlesLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article: any) => (
                  <Card key={article.id} className={article.isFeatured ? "border-primary border-2" : ""} data-testid={`article-card-${article.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {article.title}
                            </h3>
                            {article.isFeatured && (
                              <Badge variant="default" className="bg-amber-500">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            <Badge variant={article.status === 'published' ? 'default' : 'outline'}>
                              {article.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                            {article.excerpt || article.content?.substring(0, 150)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {article.categories?.map((cat: any) => (
                              <Badge 
                                key={cat.id}
                                variant="secondary"
                                style={{ backgroundColor: cat.color + '20', color: cat.color }}
                              >
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={article.isFeatured}
                            onCheckedChange={(checked) => {
                              toggleArticleFeatured.mutate({ id: article.id, isFeatured: checked });
                            }}
                            data-testid={`toggle-article-${article.id}`}
                          />
                          {article.isFeatured ? (
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="podcasts" data-testid="content-podcasts">
            {podcastsLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {podcasts.map((podcast: any) => (
                  <Card key={podcast.id} className={podcast.isFeatured ? "border-primary border-2" : ""} data-testid={`podcast-card-${podcast.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {podcast.title}
                            </h3>
                            {podcast.isFeatured && (
                              <Badge variant="default" className="bg-amber-500">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            <Badge variant={podcast.status === 'published' ? 'default' : 'outline'}>
                              {podcast.status}
                            </Badge>
                            {podcast.episodeNumber && (
                              <Badge variant="secondary">
                                Episode {podcast.episodeNumber}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                            {podcast.description}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {podcast.categories?.map((cat: any) => (
                              <Badge 
                                key={cat.id}
                                variant="secondary"
                                style={{ backgroundColor: cat.color + '20', color: cat.color }}
                              >
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={podcast.isFeatured}
                            onCheckedChange={(checked) => {
                              togglePodcastFeatured.mutate({ id: podcast.id, isFeatured: checked });
                            }}
                            data-testid={`toggle-podcast-${podcast.id}`}
                          />
                          {podcast.isFeatured ? (
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discussions" data-testid="content-discussions">
            {discussionsLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion: any) => (
                  <Card key={discussion.id} className={discussion.isFeatured ? "border-primary border-2" : ""} data-testid={`discussion-card-${discussion.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {discussion.title}
                            </h3>
                            {discussion.isFeatured && (
                              <Badge variant="default" className="bg-amber-500">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                            <Badge variant={discussion.status === 'published' ? 'default' : 'outline'}>
                              {discussion.status}
                            </Badge>
                            {discussion.isPinned && (
                              <Badge variant="secondary">Pinned</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                            {discussion.content?.substring(0, 150)}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">
                              {discussion.category?.name}
                            </Badge>
                            {discussion.newsCategories?.map((cat: any) => (
                              <Badge 
                                key={cat.id}
                                variant="secondary"
                                style={{ backgroundColor: cat.color + '20', color: cat.color }}
                              >
                                {cat.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={discussion.isFeatured}
                            onCheckedChange={(checked) => {
                              toggleDiscussionFeatured.mutate({ id: discussion.id, isFeatured: checked });
                            }}
                            data-testid={`toggle-discussion-${discussion.id}`}
                          />
                          {discussion.isFeatured ? (
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          ) : (
                            <StarOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
