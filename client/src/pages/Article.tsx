import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, ExternalLink, Heart, MessageCircle, Share2, Edit, Trash2, Archive, ArchiveRestore, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { insertNewsArticleSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { z } from "zod";

type ArticleFormData = {
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceName?: string;
  categoryIds: string[];
};

export default function Article() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useLocation();
  const [commentContent, setCommentContent] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  const articleFormSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    excerpt: z.string().optional(),
    imageUrl: z.string().optional(),
    sourceUrl: z.string().optional(),
    sourceName: z.string().optional(),
    categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  });

  const articleForm = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      imageUrl: "",
      sourceUrl: "",
      sourceName: "",
      categoryIds: [],
    },
  });

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

  const { data: newsCategories = [] } = useQuery<any[]>({
    queryKey: ['/api/news-categories'],
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ['/api/news', id, 'comments'],
    enabled: !!id,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/news/${id}/comments`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news', id, 'comments'] });
      setCommentContent("");
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest(`/api/news/comments/${commentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news', id, 'comments'] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be signed in to post a comment.",
        variant: "destructive",
      });
      return;
    }
    if (commentContent.trim().length === 0) {
      toast({
        title: "Comment required",
        description: "Please enter a comment before submitting.",
        variant: "destructive",
      });
      return;
    }
    createCommentMutation.mutate(commentContent);
  };

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  const updateArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      return apiRequest(`/api/news/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      setIsEditing(false);
      toast({
        title: "Article updated",
        description: "The article has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update the article. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/news/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Success",
        description: "Article deleted successfully",
      });
      setLocation("/news"); // Redirect to news page
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete article",
        variant: "destructive",
      });
    },
  });

  // Archive article mutation
  const archiveArticleMutation = useMutation({
    mutationFn: async (isArchived: boolean) => {
      return apiRequest(`/api/news/${id}/archive`, "PATCH", { isArchived });
    },
    onSuccess: (_, isArchived) => {
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      toast({
        title: "Success",
        description: isArchived ? "Article archived successfully" : "Article unarchived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive/unarchive article",
        variant: "destructive",
      });
    },
  });

  const handleEditArticle = () => {
    if (article) {
      const categoryIds = article.categories?.map((cat: any) => cat.id) || article.categoryIds || [];
      articleForm.reset({
        title: article.title || "",
        content: article.content || "",
        excerpt: article.excerpt || "",
        imageUrl: article.imageUrl || "",
        sourceUrl: article.sourceUrl || "",
        sourceName: article.sourceName || "",
        categoryIds: categoryIds,
      });
      setIsEditing(true);
    }
  };

  const onSubmitArticle = (data: ArticleFormData) => {
    console.log("Submitting article with data:", data);
    console.log("Image URL being submitted:", data.imageUrl);
    updateArticleMutation.mutate(data);
  };

  // Get like count from localStorage (only for anonymous users)
  const getLocalLikeCount = (articleId: string): number => {
    const likeCounts = JSON.parse(localStorage.getItem('articleLikeCounts') || '{}');
    return likeCounts[articleId] || 0;
  };

  // Calculate optimistic like count
  const getOptimisticLikeCount = (article: any) => {
    const dbCount = article.likes || 0;
    // Only add localStorage count for anonymous users (no double counting)
    if (user) {
      return dbCount; // Authenticated: database has the real count
    }
    return dbCount + getLocalLikeCount(article.id); // Anonymous: add localStorage count
  };

  const likeMutation = useMutation({
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
      
      queryClient.invalidateQueries({ queryKey: ["/api/news", id] });
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

  const handleLike = () => {
    if (id) {
      likeMutation.mutate(id);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/news/${id}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "Article link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share Link",
        description: url,
        duration: 5000,
      });
    }
  };

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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={handleEditArticle}
                  data-testid="button-edit-article"
                >
                  <Edit className="h-4 w-4" />
                  Edit Article
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => archiveArticleMutation.mutate(!article.isArchived)}
                  disabled={archiveArticleMutation.isPending}
                  data-testid="button-archive-article"
                >
                  {article.isArchived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4" />
                      {archiveArticleMutation.isPending ? "Unarchiving..." : "Unarchive"}
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
                      {archiveArticleMutation.isPending ? "Archiving..." : "Archive"}
                    </>
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="flex items-center gap-2"
                      data-testid="button-delete-article"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Article</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this article? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteArticleMutation.mutate()}
                        disabled={deleteArticleMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="button-confirm-delete"
                      >
                        {deleteArticleMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          
          <Card>
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {article.categories && article.categories.length > 0 ? (
                    article.categories.map((category: any) => (
                      <Badge 
                        key={category.id}
                        variant="default"
                        style={{ backgroundColor: category.color, color: '#fff' }}
                        data-testid={`article-category-${category.slug}`}
                      >
                        {category.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="capitalize" data-testid="article-category">
                      {article.category?.replace('-', ' ') || 'General'}
                    </Badge>
                  )}
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

              <div className="mb-8">
                <img 
                  src={article.imageUrl || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80"}
                  alt={article.title}
                  className="w-full h-96 object-cover rounded-lg shadow-lg"
                  data-testid="article-image"
                  onError={(e) => {
                    // Fallback to default image if the uploaded image fails to load
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80";
                  }}
                />
              </div>

              <div className="prose prose-lg max-w-none dark:prose-invert mb-8" data-testid="article-content">
                {article.content ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
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
                  <button
                    className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 transition-colors hover:text-red-500"
                    onClick={handleLike}
                    data-testid={`like-${article.id}`}
                  >
                    <Heart className="h-5 w-5" />
                    <span data-testid="article-likes">{getOptimisticLikeCount(article)}</span>
                  </button>
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <MessageCircle className="h-5 w-5" />
                    <span data-testid="comment-count">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleShare}
                  data-testid="button-share-article"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Edit Article Dialog */}
          {isEditing && (
            <Dialog open={isEditing} onOpenChange={() => setIsEditing(false)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Article</DialogTitle>
                  <DialogDescription>
                    Update the article content and information
                  </DialogDescription>
                </DialogHeader>
                <Form {...articleForm}>
                  <form onSubmit={articleForm.handleSubmit(onSubmitArticle)} className="space-y-6">
                    <FormField
                      control={articleForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter article title..." {...field} data-testid="input-edit-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={articleForm.control}
                      name="excerpt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Excerpt</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief summary of the article..." 
                              className="resize-none" 
                              rows={3}
                              {...field}
                              value={field.value || ''}
                              data-testid="input-edit-excerpt"
                            />
                          </FormControl>
                          <FormDescription>
                            A short summary that will appear in the article preview.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={articleForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Write the full article content here..." 
                              className="resize-none min-h-[200px]" 
                              {...field}
                              data-testid="input-edit-content"
                            />
                          </FormControl>
                          <FormDescription>
                            The main content of the article. Line breaks will be preserved.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={articleForm.control}
                      name="categoryIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categories</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {newsCategories.map((category: any) => {
                                  const isSelected = field.value?.includes(category.id);
                                  const handleToggle = () => {
                                    const newValue = isSelected
                                      ? field.value?.filter(id => id !== category.id) || []
                                      : [...(field.value || []), category.id];
                                    field.onChange(newValue);
                                  };
                                  return (
                                    <Badge
                                      key={category.id}
                                      variant={isSelected ? "default" : "outline"}
                                      className="cursor-pointer hover:opacity-80 transition-opacity focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                      style={isSelected ? { backgroundColor: category.color, color: '#fff' } : {}}
                                      onClick={handleToggle}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleToggle();
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      aria-pressed={isSelected}
                                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${category.name} category`}
                                      data-testid={`badge-edit-category-${category.slug}`}
                                    >
                                      {category.name}
                                    </Badge>
                                  );
                                })}
                              </div>
                              {field.value && field.value.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {field.value.length} {field.value.length === 1 ? 'category' : 'categories'} selected
                                </p>
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Select one or more categories that best describe this article.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={articleForm.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Article Image (Optional)</FormLabel>
                          <div className="space-y-4">
                            {/* File Upload Option */}
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
                              <div className="flex flex-col items-center gap-4">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div className="text-center space-y-2">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isUploadingImage ? "Uploading..." : "Upload Article Image"}
                                  </p>
                                  {selectedFileName && !isUploadingImage && (
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                      Selected: {selectedFileName}
                                    </p>
                                  )}
                                  <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    data-testid="input-upload-image"
                                    disabled={isUploadingImage}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;

                                      // Show selected filename
                                      setSelectedFileName(file.name);

                                      // Validate file size (5MB)
                                      if (file.size > 5242880) {
                                        toast({
                                          title: "File too large",
                                          description: "Image must be less than 5MB",
                                          variant: "destructive",
                                        });
                                        setSelectedFileName("");
                                        e.target.value = '';
                                        return;
                                      }

                                      // Validate file type
                                      if (!file.type.startsWith('image/')) {
                                        toast({
                                          title: "Invalid file type",
                                          description: "Please select an image file",
                                          variant: "destructive",
                                        });
                                        setSelectedFileName("");
                                        e.target.value = '';
                                        return;
                                      }

                                      try {
                                        setIsUploadingImage(true);
                                        console.log("Starting upload for:", file.name);
                                        
                                        // Get upload URL from backend
                                        const uploadParams = await apiRequest("/api/objects/upload", "POST");
                                        console.log("Got upload URL:", uploadParams);

                                        // Upload file to cloud storage
                                        const uploadResponse = await fetch(uploadParams.uploadURL, {
                                          method: "PUT",
                                          body: file,
                                          headers: {
                                            "Content-Type": file.type,
                                          },
                                        });

                                        if (!uploadResponse.ok) {
                                          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
                                        }

                                        console.log("Upload successful, setting ACL...");

                                        // Set ACL policy
                                        const aclResponse = await apiRequest("/api/articles/images", "PUT", {
                                          imageURL: uploadParams.uploadURL.split('?')[0], // Remove query params
                                        });

                                        // Set the public URL
                                        const publicURL = `/public-objects${aclResponse.objectPath}`;
                                        console.log("Setting image URL to:", publicURL);
                                        
                                        // Use both field.onChange and setValue for reliability
                                        field.onChange(publicURL);
                                        articleForm.setValue('imageUrl', publicURL, { shouldDirty: true, shouldValidate: true });
                                        
                                        console.log("Current form values after upload:", articleForm.getValues());

                                        toast({
                                          title: "Success",
                                          description: `${file.name} uploaded successfully!`,
                                        });

                                        // Reset file input but keep filename visible as confirmation
                                        e.target.value = '';
                                      } catch (error) {
                                        console.error("Upload error:", error);
                                        toast({
                                          title: "Upload Failed",
                                          description: error instanceof Error ? error.message : "Failed to upload image",
                                          variant: "destructive",
                                        });
                                        setSelectedFileName("");
                                        e.target.value = '';
                                      } finally {
                                        setIsUploadingImage(false);
                                      }
                                    }}
                                  />
                                  <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
                                </div>
                              </div>
                            </div>

                            {/* URL Input Option */}
                            <div className="relative">
                              <p className="text-sm text-gray-500 mb-2">Or enter image URL:</p>
                              <FormControl>
                                <Input 
                                  placeholder="https://example.com/image.jpg" 
                                  {...field}
                                  value={field.value || ''}
                                  data-testid="input-edit-image"
                                />
                              </FormControl>
                            </div>

                            {/* Current Image Preview */}
                            {field.value && (
                              <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm text-gray-500">Current Image:</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange('');
                                      toast({
                                        title: "Image removed",
                                        description: "The image has been cleared",
                                      });
                                    }}
                                    data-testid="button-clear-image"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear Image
                                  </Button>
                                </div>
                                <img 
                                  src={field.value} 
                                  alt="Article preview" 
                                  className="w-full h-32 object-cover rounded-md"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <p className="text-xs text-gray-400 mt-1 break-all">{field.value}</p>
                              </div>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={articleForm.control}
                        name="sourceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Name (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. TechCrunch, Forbes" 
                                {...field}
                                value={field.value || ''}
                                data-testid="input-edit-source-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={articleForm.control}
                        name="sourceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source URL (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/original-article" 
                                {...field}
                                value={field.value || ''}
                                data-testid="input-edit-source-url"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateArticleMutation.isPending}
                        data-testid="button-save-edit"
                      >
                        {updateArticleMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          {/* Comments Section */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Comments ({comments.length})
              </h2>

              {/* Comment Form */}
              {user ? (
                <form onSubmit={handleSubmitComment} className="mb-8">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Share your thoughts on this article..."
                    className="mb-3 resize-none"
                    rows={4}
                    data-testid="input-comment"
                  />
                  <Button
                    type="submit"
                    disabled={createCommentMutation.isPending || commentContent.trim().length === 0}
                    data-testid="button-submit-comment"
                  >
                    {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
                  </Button>
                </form>
              ) : (
                <div className="mb-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Sign in to leave a message
                  </p>
                  <Button
                    onClick={() => setLocation("/login")}
                    data-testid="button-login-to-comment"
                  >
                    Sign In
                  </Button>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className="border-b last:border-0 pb-6 last:pb-0"
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                            {comment.author?.firstName?.[0] || comment.author?.email?.[0] || '?'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {comment.author?.firstName && comment.author?.lastName
                                  ? `${comment.author.firstName} ${comment.author.lastName}`
                                  : comment.author?.email || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {user && (user as any).id === comment.authorId ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                data-testid={`button-delete-comment-${comment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}