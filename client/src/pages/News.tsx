import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, Search, PlusCircle, CheckCircle, XCircle, Pencil } from "lucide-react";
import { Link, useLocation } from "wouter";
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

export default function News() {
  const [location, setLocation] = useLocation();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const userRole = (user as any)?.role;
  const { toast } = useToast();
  const isEditorOrAdmin = userRole === 'editor' || userRole === 'admin';

  // Sync state with URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const categoriesParam = params.get('categories');
    if (categoriesParam) {
      setSelectedCategories(categoriesParam.split(','));
    }
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) {
      params.set('categories', selectedCategories.join(','));
    }
    const newPath = params.toString() ? `/news?${params.toString()}` : '/news';
    setLocation(newPath, { replace: true });
  }, [selectedCategories, setLocation]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ articleId, newStatus }: { articleId: string; newStatus: string }) => {
      return await apiRequest(`/api/news/${articleId}/status`, 'PATCH', { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Status updated",
        description: `Article ${variables.newStatus === 'published' ? 'published' : 'set to draft'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update article status.",
        variant: "destructive",
      });
    },
  });

  // Fetch all news to get complete category list (unfiltered)
  const { data: allNews } = useQuery({
    queryKey: ["/api/news", "all"],
    queryFn: () => fetch("/api/news?limit=50").then(res => res.json()),
  });

  // Fetch filtered news based on selected categories
  const { data: news, isLoading } = useQuery({
    queryKey: ["/api/news", selectedCategories],
    queryFn: () => {
      const url = selectedCategories.length === 0
        ? "/api/news?limit=50" 
        : `/api/news?categories=${selectedCategories.join(',')}&limit=50`;
      return fetch(url).then(res => res.json());
    },
  });

  // Extract unique categories from all news (keeps filter buttons stable)
  const categoriesData = allNews?.reduce((acc: NewsCategory[], article: any) => {
    article.categories?.forEach((cat: NewsCategory) => {
      if (!acc.find(c => c.id === cat.id)) {
        acc.push(cat);
      }
    });
    return acc;
  }, []) || [];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredNews = news?.filter((article: any) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Check if an article is liked (from localStorage for anonymous users)
  const isArticleLiked = (articleId: string): boolean => {
    const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
    return likedArticles.includes(articleId);
  };

  const likeMutation = useMutation({
    mutationFn: async (articleId: string) => {
      return await apiRequest(`/api/news/${articleId}/like`, 'POST');
    },
    onSuccess: (_, articleId) => {
      // Update localStorage for UI state (for both anonymous and authenticated users)
      const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '[]');
      const isLiked = likedArticles.includes(articleId);
      
      if (isLiked) {
        // Remove from liked list
        const updated = likedArticles.filter((id: string) => id !== articleId);
        localStorage.setItem('likedArticles', JSON.stringify(updated));
      } else {
        // Add to liked list
        likedArticles.push(articleId);
        localStorage.setItem('likedArticles', JSON.stringify(likedArticles));
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

  const handleLike = (articleId: string) => {
    likeMutation.mutate(articleId);
  };

  const handleShare = async (article: any) => {
    const url = `${window.location.origin}/news/${article.id}`;
    
    try {
      // Try clipboard API (works in all modern browsers)
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "Article link has been copied to your clipboard.",
      });
    } catch (error) {
      // Fallback if clipboard API fails
      toast({
        title: "Share Link",
        description: url,
        duration: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
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
        <div className="mb-8" data-testid="news-header">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Latest Corporate Finance and Accounting News
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl">
                Stay updated with curated insights from trusted sources, academic journals, and industry leaders
              </p>
            </div>
            {(userRole === 'editor' || userRole === 'admin') && (
              <Link href="/news/add">
                <Button 
                  className="flex items-center gap-2"
                  data-testid="button-add-news"
                >
                  <PlusCircle className="h-5 w-5" />
                  Add News
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2" data-testid="category-filters">
            {categoriesData.map((category: NewsCategory) => (
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
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-news"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* News Grid */}
        {filteredNews.length === 0 ? (
          <div className="text-center py-16" data-testid="no-news">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No articles found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="news-grid">
            {filteredNews.map((article: any) => (
              <Card key={article.id} className="hover:shadow-lg transition-shadow duration-300 relative" data-testid={`news-card-${article.id}`}>
                {isEditorOrAdmin && (
                  <Link href={`/news/${article.id}/edit`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 z-10 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                      data-testid={`button-edit-news-${article.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href={`/news/${article.id}`}>
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg cursor-pointer">
                    <img 
                      src={article.imageUrl || "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </Link>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {article.categories && article.categories.length > 0 ? (
                      article.categories.map((cat: NewsCategory) => (
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
                    {isEditorOrAdmin && (
                      <Badge 
                        variant={article.status === 'published' ? 'default' : 'outline'}
                        className={article.status === 'published' ? 'bg-green-500 text-white' : 'border-amber-500 text-amber-600 dark:text-amber-400'}
                        data-testid={`status-${article.id}`}
                      >
                        {article.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    )}
                    <span className="text-gray-500 dark:text-gray-400 text-sm" data-testid={`time-${article.id}`}>
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <Link href={`/news/${article.id}`}>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 hover:text-primary dark:hover:text-ai-teal transition-colors cursor-pointer" data-testid={`title-${article.id}`}>
                      {article.title}
                    </h3>
                  </Link>
                  
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
                        className={`flex items-center space-x-1 transition-colors ${
                          isArticleLiked(article.id) 
                            ? 'text-red-500' 
                            : 'hover:text-red-500'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleLike(article.id);
                        }}
                        data-testid={`like-${article.id}`}
                      >
                        <Heart 
                          className="h-4 w-4" 
                          fill={isArticleLiked(article.id) ? 'currentColor' : 'none'}
                        />
                        <span>{article.likes || 0}</span>
                      </button>
                      <button 
                        className="flex items-center space-x-1 hover:text-blue-500 transition-colors" 
                        onClick={(e) => e.preventDefault()}
                        data-testid={`comment-${article.id}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>0</span>
                      </button>
                      <button 
                        className="flex items-center space-x-1 hover:text-green-500 transition-colors" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleShare(article);
                        }}
                        data-testid={`share-${article.id}`}
                      >
                        <Share className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                    
                    {article.sourceUrl && (
                      <Link href={`/news/${article.id}`}>
                        <span className="text-sm font-medium text-primary dark:text-ai-teal cursor-pointer">
                          Read More →
                        </span>
                      </Link>
                    )}
                  </div>

                  {isEditorOrAdmin && (
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        size="sm"
                        variant={article.status === 'published' ? 'outline' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatusMutation.mutate({
                            articleId: article.id,
                            newStatus: article.status === 'published' ? 'draft' : 'published'
                          });
                        }}
                        disabled={toggleStatusMutation.isPending}
                        data-testid={`toggle-status-${article.id}`}
                        className="flex items-center gap-1"
                      >
                        {article.status === 'published' ? (
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
        {filteredNews.length > 0 && filteredNews.length % 12 === 0 && (
          <div className="text-center mt-12">
            <Button 
              size="lg"
              className="bg-primary hover:bg-blue-700 text-white"
              data-testid="button-load-more"
            >
              Load More Articles
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
