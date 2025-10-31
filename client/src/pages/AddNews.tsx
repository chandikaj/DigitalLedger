import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { insertNewsArticleSchema } from "@shared/schema";
import { z } from "zod";
import { Upload, FileText, Image, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { UploadResult } from "@uppy/core";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  excerpt: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceName: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

export default function AddNews() {
  const [uploadingArticleImage, setUploadingArticleImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch active categories
  const { data: newsCategories = [] } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news-categories", "active"],
    queryFn: () => fetch("/api/news-categories?activeOnly=true").then(res => res.json()),
  });

  const articleForm = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      category: "",
      sourceUrl: "",
      sourceName: "",
      imageUrl: "",
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: ArticleFormData) => {
      return await apiRequest("/api/news", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Article created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      articleForm.reset();
      setTimeout(() => setLocation("/news"), 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create article. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating article:", error);
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/upload-parameters", "GET");
    return response as { method: "PUT"; url: string };
  };

  const handleArticleImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        setUploadingArticleImage(true);
        const response = await apiRequest("/api/articles/images", "PUT", {
          imageURL: uploadURL,
        }) as { objectPath: string };
        articleForm.setValue("imageUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Article image uploaded successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process uploaded image.",
          variant: "destructive",
        });
        console.error("Error processing image upload:", error);
      } finally {
        setUploadingArticleImage(false);
      }
    }
  };

  const onSubmitArticle = (data: ArticleFormData) => {
    createArticleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/news">
              <Button variant="ghost" className="flex items-center gap-2 mb-4" data-testid="button-back-to-news">
                <ArrowLeft className="h-4 w-4" />
                Back to News
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-add-news-title">
              Create News Article
            </h1>
            <p className="text-gray-600 dark:text-gray-300" data-testid="text-add-news-description">
              Add a new article to keep The Digital Ledger community updated on AI developments in accounting.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-article-form-title">
                <FileText className="h-5 w-5" />
                Article Details
              </CardTitle>
              <CardDescription data-testid="text-article-form-description">
                Fill in the details below to publish a new article.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...articleForm}>
                <form onSubmit={articleForm.handleSubmit(onSubmitArticle)} className="space-y-6">
                  <FormField
                    control={articleForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter article title..." {...field} data-testid="input-article-title" />
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
                            data-testid="input-article-excerpt"
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
                            placeholder="Write the full article content..." 
                            className="resize-none" 
                            rows={12}
                            {...field} 
                            data-testid="input-article-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={articleForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-article-category">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {newsCategories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={articleForm.control}
                      name="sourceName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., TechCrunch, Forbes..." {...field} value={field.value || ''} data-testid="input-article-source-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={articleForm.control}
                    name="sourceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="https://example.com/original-article" 
                            {...field}
                            value={field.value || ''}
                            data-testid="input-article-source-url"
                          />
                        </FormControl>
                        <FormDescription>
                          Link to the original article if you're sharing external content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">Featured Image</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Upload an image to accompany your article (Max 5MB).
                        </p>
                      </div>
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleArticleImageUpload}
                        buttonClassName="flex items-center gap-2"
                      >
                        <Image className="h-4 w-4" />
                        {uploadingArticleImage ? "Processing..." : "Upload Image"}
                      </ObjectUploader>
                    </div>
                    {articleForm.watch("imageUrl") && (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-article-image-uploaded">
                        Image uploaded successfully
                      </Badge>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Link href="/news">
                      <Button 
                        type="button"
                        variant="outline"
                        data-testid="button-cancel-article"
                      >
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={createArticleMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid="button-create-article"
                    >
                      <Upload className="h-4 w-4" />
                      {createArticleMutation.isPending ? "Creating..." : "Publish Article"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
