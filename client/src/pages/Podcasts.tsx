import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  PlayCircle, 
  Heart,
  Headphones,
  Clock,
  Mic,
  Calendar,
  PlusCircle,
  Pencil,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export default function Podcasts() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const userRole = (user as any)?.role;
  const { toast } = useToast();
  const isEditorOrAdmin = userRole === 'editor' || userRole === 'admin';

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ episodeId, newStatus }: { episodeId: string; newStatus: string }) => {
      return await apiRequest(`/api/podcasts/${episodeId}/status`, 'PATCH', { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts/featured"] });
      toast({
        title: "Status updated",
        description: `Episode ${variables.newStatus === 'published' ? 'published' : 'set to draft'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update episode status.",
        variant: "destructive",
      });
    },
  });

  const { data: categoriesData = [] } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news-categories", "active"],
    queryFn: () => fetch("/api/news-categories?activeOnly=true").then(res => res.json()),
  });

  const { data: episodes, isLoading } = useQuery({
    queryKey: ["/api/podcasts", selectedCategories],
    queryFn: () => {
      const url = selectedCategories.length === 0
        ? "/api/podcasts?limit=50" 
        : `/api/podcasts?categoryIds=${selectedCategories.join(',')}&limit=50`;
      return fetch(url).then(res => res.json());
    },
  });

  const { data: featuredEpisode } = useQuery({
    queryKey: ["/api/podcasts/featured"],
    queryFn: () => fetch("/api/podcasts/featured").then(res => res.json()),
  });

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredEpisodes = episodes?.filter((episode: any) =>
    episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    episode.guestName?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatDuration = (minutes: string) => {
    const num = parseInt(minutes);
    if (isNaN(num)) return minutes;
    const hours = Math.floor(num / 60);
    const mins = num % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12" data-testid="podcast-header">
          <div className="flex justify-center items-start mb-4 relative">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                The Digital Ledger Podcast Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto">
                Listen to expert interviews, industry insights, and practical discussions about the future of AI in accounting
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              {(userRole === 'editor' || userRole === 'admin') && (
                <Link href="/podcasts/add">
                  <Button 
                    className="flex items-center gap-2"
                    data-testid="button-add-podcast"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add Podcast
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Featured Episode Player */}
        {featuredEpisode && (
          <Card className="mb-12 relative" data-testid="featured-episode">
            {(userRole === 'editor' || userRole === 'admin') && (
              <Link href={`/podcasts/${featuredEpisode.id}/edit`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                  data-testid="button-edit-featured-podcast"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
                <img 
                  src={featuredEpisode.imageUrl || "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
                  alt={featuredEpisode.title}
                  className="w-full lg:w-80 h-64 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <Badge variant="default" data-testid="featured-badge">Featured Episode</Badge>
                    {isEditorOrAdmin && (
                      <Badge 
                        variant={featuredEpisode.status === 'published' ? 'default' : 'outline'}
                        className={featuredEpisode.status === 'published' ? 'bg-green-500 text-white' : 'border-amber-500 text-amber-600 dark:text-amber-400'}
                        data-testid="status-featured"
                      >
                        {featuredEpisode.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    )}
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      Episode {featuredEpisode.episodeNumber} • {formatDuration(featuredEpisode.duration || "45")}
                    </span>
                  </div>
                  {featuredEpisode.categories && featuredEpisode.categories.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {featuredEpisode.categories.map((cat: NewsCategory) => (
                        <Badge 
                          key={cat.id}
                          style={{ backgroundColor: cat.color, color: '#fff' }}
                          data-testid={`badge-category-${cat.slug}`}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4" data-testid="featured-title">
                    {featuredEpisode.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6" data-testid="featured-description">
                    {featuredEpisode.description}
                  </p>
                  
                  {/* Watch on YouTube Button */}
                  {featuredEpisode.audioUrl && (
                    <div className="mb-6">
                      <Button 
                        asChild
                        size="lg"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-watch-youtube-featured"
                      >
                        <a 
                          href={featuredEpisode.audioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2"
                        >
                          <PlayCircle className="h-5 w-5" />
                          <span>Watch on YouTube</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Published {new Date(featuredEpisode.publishedAt).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Headphones className="h-4 w-4" />
                      <span>{featuredEpisode.playCount?.toLocaleString() || 0} plays</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{featuredEpisode.likes || 0} likes</span>
                    </span>
                  </div>

                  {isEditorOrAdmin && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant={featuredEpisode.status === 'published' ? 'outline' : 'default'}
                        onClick={() => {
                          toggleStatusMutation.mutate({
                            episodeId: featuredEpisode.id,
                            newStatus: featuredEpisode.status === 'published' ? 'draft' : 'published'
                          });
                        }}
                        disabled={toggleStatusMutation.isPending}
                        data-testid="toggle-status-featured"
                        className="flex items-center gap-1"
                      >
                        {featuredEpisode.status === 'published' ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Publish
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2" data-testid="category-filters">
            {categoriesData.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category.id)}
                data-testid={`filter-${category.slug}`}
              >
                {category.name}
              </Button>
            ))}
            {selectedCategories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategories([])}
                data-testid="filter-clear"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Input
              type="search"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-episodes"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Recent Episodes */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {searchQuery ? `Search Results (${filteredEpisodes.length})` : "Recent Episodes"}
          </h2>
        </div>

        {filteredEpisodes.length === 0 ? (
          <div className="text-center py-16" data-testid="no-episodes">
            <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery ? "No episodes found matching your search." : "No episodes available yet."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="episodes-grid">
            {filteredEpisodes.map((episode: any) => (
              <Card key={episode.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 relative" data-testid={`episode-card-${episode.id}`}>
                {(userRole === 'editor' || userRole === 'admin') && (
                  <Link href={`/podcasts/${episode.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                      data-testid={`button-edit-podcast-${episode.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={episode.imageUrl || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=300"}
                    alt={episode.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge variant="secondary" data-testid={`episode-number-${episode.id}`}>
                      Episode {episode.episodeNumber}
                    </Badge>
                    {isEditorOrAdmin && (
                      <Badge 
                        variant={episode.status === 'published' ? 'default' : 'outline'}
                        className={episode.status === 'published' ? 'bg-green-500 text-white' : 'border-amber-500 text-amber-600 dark:text-amber-400'}
                        data-testid={`status-${episode.id}`}
                      >
                        {episode.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    )}
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {formatDuration(episode.duration || "30")}
                    </span>
                  </div>
                  
                  {episode.categories && episode.categories.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {episode.categories.map((cat: NewsCategory) => (
                        <Badge 
                          key={cat.id}
                          style={{ backgroundColor: cat.color, color: '#fff' }}
                          data-testid={`badge-category-${cat.slug}`}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2" data-testid={`episode-title-${episode.id}`}>
                    {episode.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3" data-testid={`episode-description-${episode.id}`}>
                    {episode.description}
                  </p>
                  
                  {(episode.guestName || episode.hostName) && (
                    <div className="mb-4">
                      {episode.hostName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Host: {episode.hostName}
                        </p>
                      )}
                      {episode.guestName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Guest: {episode.guestName}
                          {episode.guestTitle && `, ${episode.guestTitle}`}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Headphones className="h-4 w-4" />
                        <span>{episode.playCount?.toLocaleString() || 0}</span>
                      </span>
                      <span>{new Date(episode.publishedAt).toLocaleDateString()}</span>
                    </div>
                    
                    {episode.audioUrl ? (
                      <Button 
                        asChild
                        variant="ghost"
                        size="sm"
                        className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        data-testid={`watch-youtube-${episode.id}`}
                      >
                        <a 
                          href={episode.audioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1"
                        >
                          <PlayCircle className="h-4 w-4" />
                          <span>Watch</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost"
                        size="sm"
                        disabled
                        className="text-gray-400"
                        data-testid={`no-link-${episode.id}`}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        No Link
                      </Button>
                    )}
                  </div>

                  {isEditorOrAdmin && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant={episode.status === 'published' ? 'outline' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatusMutation.mutate({
                            episodeId: episode.id,
                            newStatus: episode.status === 'published' ? 'draft' : 'published'
                          });
                        }}
                        disabled={toggleStatusMutation.isPending}
                        data-testid={`toggle-status-${episode.id}`}
                        className="flex items-center gap-1"
                      >
                        {episode.status === 'published' ? (
                          <>
                            <XCircle className="h-4 w-4" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Publish
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredEpisodes.length > 0 && filteredEpisodes.length % 12 === 0 && (
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg"
              data-testid="button-load-more-episodes"
            >
              Load More Episodes
            </Button>
          </div>
        )}

        {/* Subscription CTA */}
        <div className="mt-16 bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white text-center" data-testid="subscription-cta">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Never Miss an Episode</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Subscribe to stay updated with the latest insights from industry leaders and AI accounting experts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-spotify"
            >
              <span>🎵</span>
              <span>Spotify</span>
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-apple"
            >
              <span>🍎</span>
              <span>Apple Podcasts</span>
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-gray-100 flex items-center justify-center space-x-2"
              data-testid="button-google"
            >
              <span>🎧</span>
              <span>Google Podcasts</span>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
