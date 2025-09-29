import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, ExternalLink, Heart, MessageCircle, Share2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Article() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['/api/news', id],
    queryFn: async () => {
      const response = await fetch(`/api/news/${id}`);
      if (!response.ok) {
        throw new Error('Article not found');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Skeleton className="h-10 w-32 mb-4" />
            </div>
            
            <Card>
              <CardContent className="p-8">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-6 w-1/2 mb-6" />
                <Skeleton className="h-64 w-full mb-6 rounded-lg" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/news">
              <Button variant="ghost" className="mb-6" data-testid="button-back-to-news">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>
            
            <Card>
              <CardContent className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Article Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  The article you're looking for doesn't exist or may have been removed.
                </p>
                <Link href="/news">
                  <Button>Browse All Articles</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link href="/news">
              <Button variant="ghost" data-testid="button-back-to-news">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to News
              </Button>
            </Link>
            
            {(user as any)?.role === 'admin' && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                data-testid="button-edit-article"
              >
                <Edit className="h-4 w-4" />
                Edit Article
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="secondary" className="capitalize" data-testid="article-category">
                    {article.category?.replace('-', ' ') || 'General'}
                  </Badge>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span data-testid="article-date">
                      {new Date(article.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight" data-testid="article-title">
                  {article.title}
                </h1>
                
                {article.excerpt && (
                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed" data-testid="article-excerpt">
                    {article.excerpt}
                  </p>
                )}
              </div>

              {article.imageUrl && (
                <div className="mb-8">
                  <img 
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-96 object-cover rounded-lg shadow-lg"
                    data-testid="article-image"
                  />
                </div>
              )}

              <div className="prose prose-lg max-w-none dark:prose-invert mb-8" data-testid="article-content">
                {article.content ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }} />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">
                    No content available for this article.
                  </p>
                )}
              </div>

              {article.sourceName && article.sourceUrl && (
                <div className="border-t pt-6 mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Original Source:
                  </p>
                  <a 
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary/80 dark:text-ai-teal dark:hover:text-ai-teal/80 transition-colors"
                    data-testid="article-source-link"
                  >
                    <span className="font-medium">{article.sourceName}</span>
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <Heart className="h-5 w-5" />
                    <span data-testid="article-likes">{article.likes || 0}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <MessageCircle className="h-5 w-5" />
                    <span>0 comments</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}