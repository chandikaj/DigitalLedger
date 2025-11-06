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
import { apiRequest } from "@/lib/queryClient";
import { insertNewsArticleSchema } from "@shared/schema";
import { z } from "zod";
import { Upload, FileText, Image, ArrowLeft, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { RichTextEditor } from "@/components/RichTextEditor";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

const articleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  excerpt: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceName: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;

export default function AddNews() {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
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
      categoryIds: [],
      sourceUrl: "",
      sourceName: "",
      imageUrl: "",
      status: "draft",
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
                          <RichTextEditor
                            content={field.value || ''}
                            onChange={field.onChange}
                            placeholder="Write the full article content..."
                          />
                        </FormControl>
                        <FormDescription>
                          Use the toolbar to format your content with bold, italics, headings, and more.
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
                              {newsCategories.map((category) => {
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
                                    data-testid={`badge-category-${category.slug}`}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

                  <FormField
                    control={articleForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Article Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {/* Image Preview */}
                            {field.value && (
                              <div className="relative">
                                <img 
                                  src={field.value} 
                                  alt="Article preview" 
                                  className="w-full max-h-64 object-cover rounded-lg"
                                  data-testid="img-article-preview"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    field.onChange("");
                                    articleForm.setValue('imageUrl', "", { shouldDirty: true });
                                    setSelectedFileName("");
                                    toast({
                                      title: "Image removed",
                                      description: "Article image has been cleared.",
                                    });
                                  }}
                                  data-testid="button-clear-image"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            
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
                                        
                                        // Get upload URL from backend
                                        const uploadParams = await apiRequest("/api/objects/upload", "POST");

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

                                        // Set ACL policy
                                        const aclResponse = await apiRequest("/api/articles/images", "PUT", {
                                          imageURL: uploadParams.uploadURL.split('?')[0],
                                        });

                                        // Set the public URL
                                        const publicURL = `/public-objects${aclResponse.objectPath}`;
                                        
                                        field.onChange(publicURL);
                                        articleForm.setValue('imageUrl', publicURL, { shouldDirty: true, shouldValidate: true });

                                        toast({
                                          title: "Success",
                                          description: `${file.name} uploaded successfully!`,
                                        });

                                        // Reset file input but keep filename visible
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
                          </div>
                        </FormControl>
                        <FormDescription>
                          Upload a featured image for your article. Recommended size: 1200×630px.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={articleForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-article-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft" data-testid="option-status-draft">
                              Draft - Save without publishing
                            </SelectItem>
                            <SelectItem value="published" data-testid="option-status-published">
                              Published - Make visible to all users
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Draft articles are only visible to editors and admins.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
