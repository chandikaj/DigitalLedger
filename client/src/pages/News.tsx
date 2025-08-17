import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, Search } from "lucide-react";

export default function News() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: news, isLoading } = useQuery({
    queryKey: ["/api/news", selectedCategory],
    queryFn: () => {
      const url = selectedCategory === "all" 
        ? "/api/news?limit=50" 
        : `/api/news?category=${selectedCategory}&limit=50`;
      return fetch(url).then(res => res.json());
    },
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "automation", label: "Automation" },
    { id: "fraud-detection", label: "Fraud Detection" },
    { id: "regulatory", label: "Regulatory" },
    { id: "generative-ai", label: "Generative AI" },
  ];

  const filteredNews = news?.filter((article: any) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleLike = async (articleId: string) => {
    try {
      await fetch(`/api/news/${articleId}/like`, { method: 'POST' });
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Error liking article:', error);
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Latest AI in Accounting News
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl">
            Stay updated with curated insights from trusted sources, academic journals, and industry leaders
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2" data-testid="category-filters">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                data-testid={`filter-${category.id}`}
              >
                {category.label}
              </Button>
            ))}
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
              <Card key={article.id} className="hover:shadow-lg transition-shadow duration-300" data-testid={`news-card-${article.id}`}>
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img 
                    src={article.imageUrl || "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
                    alt={article.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge 
                      variant="secondary" 
                      className="capitalize"
                      data-testid={`category-${article.id}`}
                    >
                      {article.category?.replace('-', ' ') || 'General'}
                    </Badge>
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <button 
                        className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                        onClick={() => handleLike(article.id)}
                        data-testid={`like-${article.id}`}
                      >
                        <Heart className="h-4 w-4" />
                        <span>{article.likes || 0}</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors" data-testid={`comment-${article.id}`}>
                        <MessageCircle className="h-4 w-4" />
                        <span>0</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-green-500 transition-colors" data-testid={`share-${article.id}`}>
                        <Share className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                    
                    {article.sourceUrl && (
                      <a 
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary dark:text-ai-teal hover:underline"
                        data-testid={`read-more-${article.id}`}
                      >
                        Read More →
                      </a>
                    )}
                  </div>
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
