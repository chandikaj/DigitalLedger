import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Plus, 
  Clock, 
  Heart, 
  Users,
  Brain,
  Shield,
  Award,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function Forums() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/forum/categories"],
    queryFn: () => fetch("/api/forum/categories").then(res => res.json()),
  });

  const { data: discussions, isLoading: discussionsLoading } = useQuery({
    queryKey: ["/api/forum/discussions", selectedCategory],
    queryFn: () => {
      const url = selectedCategory 
        ? `/api/forum/discussions?categoryId=${selectedCategory}&limit=50`
        : "/api/forum/discussions?limit=50";
      return fetch(url).then(res => res.json());
    },
  });

  const filteredDiscussions = discussions?.filter((discussion: any) =>
    discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getCategoryIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'ai implementation':
        return <Brain className="h-6 w-6" />;
      case 'regulatory compliance':
        return <Shield className="h-6 w-6" />;
      case 'learning & development':
        return <Award className="h-6 w-6" />;
      default:
        return <MessageSquare className="h-6 w-6" />;
    }
  };

  const getCategoryColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'ai implementation':
        return "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal";
      case 'regulatory compliance':
        return "bg-accent/10 text-accent";
      case 'learning & development':
        return "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    }
  };

  if (categoriesLoading || discussionsLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8" data-testid="forum-header">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Community Forums
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl">
              Engage with fellow professionals, share insights, and get answers to your AI accounting challenges
            </p>
          </div>
          
          {isAuthenticated && (
            <Button 
              className="mt-4 md:mt-0"
              data-testid="button-new-discussion"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </Button>
          )}
        </div>

        {/* Forum Categories */}
        <section className="mb-12" data-testid="forum-categories">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((category: any) => (
              <Card 
                key={category.id} 
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  selectedCategory === category.id ? 'ring-2 ring-primary dark:ring-ai-teal' : ''
                }`}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? "" : category.id)}
                data-testid={`category-card-${category.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${getCategoryColor(category.name)}`}>
                      {getCategoryIcon(category.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`category-name-${category.id}`}>
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400" data-testid={`category-count-${category.id}`}>
                        {category.discussionCount || 0} discussions
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4" data-testid={`category-description-${category.id}`}>
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Latest: 2 minutes ago
                    </span>
                    <span className="text-primary dark:text-ai-teal font-medium">
                      View Discussions →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedCategory ? 
                categories?.find((cat: any) => cat.id === selectedCategory)?.name + " Discussions" : 
                "Recent Discussions"
              }
            </h2>
          </div>
          
          <div className="relative w-full md:w-64">
            <Input
              type="search"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-discussions"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Discussions List */}
        <Card data-testid="discussions-list">
          <CardHeader>
            <CardTitle className="text-xl">
              {filteredDiscussions.length} Discussion{filteredDiscussions.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDiscussions.length === 0 ? (
              <div className="text-center py-16" data-testid="no-discussions">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {searchQuery ? "No discussions found matching your search." : "No discussions yet. Be the first to start one!"}
                </p>
                {isAuthenticated && (
                  <Button className="mt-4" data-testid="button-start-first-discussion">
                    <Plus className="h-4 w-4 mr-2" />
                    Start a Discussion
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDiscussions.map((discussion: any) => (
                  <div 
                    key={discussion.id} 
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    data-testid={`discussion-item-${discussion.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={discussion.author?.profileImageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {discussion.author?.firstName?.[0]}{discussion.author?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1" data-testid={`discussion-title-${discussion.id}`}>
                            {discussion.title}
                          </h3>
                          {discussion.category && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              data-testid={`discussion-category-${discussion.id}`}
                            >
                              {discussion.category.name}
                            </Badge>
                          )}
                          {discussion.isPinned && (
                            <Badge variant="secondary" className="text-xs">Pinned</Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2" data-testid={`discussion-content-${discussion.id}`}>
                          {discussion.content?.substring(0, 200)}...
                        </p>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300" data-testid={`discussion-author-${discussion.id}`}>
                            {discussion.author?.firstName} {discussion.author?.lastName}
                            {discussion.author?.title && (
                              <span className="font-normal">, {discussion.author.title}</span>
                            )}
                          </span>
                          <span data-testid={`discussion-time-${discussion.id}`}>
                            {timeAgo(discussion.createdAt)}
                          </span>
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="h-4 w-4" />
                            <span data-testid={`discussion-replies-${discussion.id}`}>
                              {discussion.replyCount || 0} replies
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span data-testid={`discussion-likes-${discussion.id}`}>
                              {discussion.likes || 0} likes
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Load More */}
        {filteredDiscussions.length > 0 && filteredDiscussions.length % 20 === 0 && (
          <div className="text-center mt-8">
            <Button 
              variant="outline" 
              size="lg"
              data-testid="button-load-more-discussions"
            >
              Load More Discussions
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
