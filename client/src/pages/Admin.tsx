import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { insertNewsArticleSchema, insertPodcastEpisodeSchema } from "@shared/schema";
import { z } from "zod";
import { Upload, FileText, Mic, Image, AudioWaveform } from "lucide-react";
import type { UploadResult } from "@uppy/core";

// Extended schemas for form validation
const articleFormSchema = insertNewsArticleSchema.extend({
  imageFile: z.string().optional(),
}).partial();

const podcastFormSchema = insertPodcastEpisodeSchema.extend({
  audioFile: z.string().optional(),
  coverImageFile: z.string().optional(),
}).partial();

type ArticleFormData = z.infer<typeof articleFormSchema>;
type PodcastFormData = z.infer<typeof podcastFormSchema>;

const newsCategories = [
  { value: "automation", label: "Automation" },
  { value: "fraud-detection", label: "Fraud Detection" },
  { value: "regulatory", label: "Regulatory" },
  { value: "generative-ai", label: "Generative AI" },
];

export default function Admin() {
  const [uploadingArticleImage, setUploadingArticleImage] = useState(false);
  const [uploadingPodcastAudio, setUploadingPodcastAudio] = useState(false);
  const [uploadingPodcastImage, setUploadingPodcastImage] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const podcastForm = useForm<PodcastFormData>({
    resolver: zodResolver(podcastFormSchema),
    defaultValues: {
      title: "",
      description: "",
      episodeNumber: 1,
      hostName: "",
      guestName: "",
      guestTitle: "",
      duration: "",
      audioUrl: "",
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

  const createPodcastMutation = useMutation({
    mutationFn: async (data: PodcastFormData) => {
      return await apiRequest("/api/podcasts", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Podcast episode created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      podcastForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create podcast episode. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating podcast:", error);
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST") as { uploadURL: string };
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
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

  const handlePodcastAudioUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        setUploadingPodcastAudio(true);
        const response = await apiRequest("/api/podcasts/audio", "PUT", {
          audioURL: uploadURL,
        }) as { objectPath: string };
        podcastForm.setValue("audioUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Podcast audio uploaded successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process uploaded audio.",
          variant: "destructive",
        });
        console.error("Error processing audio upload:", error);
      } finally {
        setUploadingPodcastAudio(false);
      }
    }
  };

  const handlePodcastImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        setUploadingPodcastImage(true);
        const response = await apiRequest("/api/articles/images", "PUT", {
          imageURL: uploadURL,
        }) as { objectPath: string };
        podcastForm.setValue("imageUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Podcast cover image uploaded successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process uploaded image.",
          variant: "destructive",
        });
        console.error("Error processing image upload:", error);
      } finally {
        setUploadingPodcastImage(false);
      }
    }
  };

  const onSubmitArticle = (data: ArticleFormData) => {
    createArticleMutation.mutate(data);
  };

  const onSubmitPodcast = (data: PodcastFormData) => {
    createPodcastMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-admin-title">
            Content Control Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-300" data-testid="text-admin-description">
            Create and manage articles and podcast episodes for the Digital Ledger community.
          </p>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="articles" className="flex items-center gap-2" data-testid="tab-articles">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="flex items-center gap-2" data-testid="tab-podcasts">
              <Mic className="h-4 w-4" />
              Podcasts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="text-article-form-title">
                  <FileText className="h-5 w-5" />
                  Create New Article
                </CardTitle>
                <CardDescription data-testid="text-article-form-description">
                  Add a new article to the news feed. Articles help keep the community updated on AI developments in accounting.
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
                              rows={10}
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
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
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
                            <FormLabel>Source Name</FormLabel>
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
                          <FormLabel>Source URL</FormLabel>
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
                            Link to the original article (if applicable).
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
                            Upload an image to accompany your article.
                          </p>
                        </div>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
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

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createArticleMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-create-article"
                      >
                        <Upload className="h-4 w-4" />
                        {createArticleMutation.isPending ? "Creating..." : "Create Article"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="podcasts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" data-testid="text-podcast-form-title">
                  <Mic className="h-5 w-5" />
                  Create New Podcast Episode
                </CardTitle>
                <CardDescription data-testid="text-podcast-form-description">
                  Add a new podcast episode to the hub. Share expert insights and discussions about AI in accounting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...podcastForm}>
                  <form onSubmit={podcastForm.handleSubmit(onSubmitPodcast)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={podcastForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Episode Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter episode title..." {...field} data-testid="input-podcast-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={podcastForm.control}
                        name="episodeNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Episode Number</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-podcast-episode-number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={podcastForm.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 45:30" {...field} value={field.value || ''} data-testid="input-podcast-duration" />
                            </FormControl>
                            <FormDescription>
                              Format: MM:SS or HH:MM:SS
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={podcastForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe what this episode covers..." 
                              className="resize-none" 
                              rows={4}
                              {...field}
                              value={field.value || ''}
                              data-testid="input-podcast-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={podcastForm.control}
                        name="hostName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Host Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Host's name" {...field} value={field.value || ''} data-testid="input-podcast-host" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={podcastForm.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Guest's name (optional)" {...field} value={field.value || ''} data-testid="input-podcast-guest" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={podcastForm.control}
                      name="guestTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Guest Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Guest's professional title (optional)" {...field} value={field.value || ''} data-testid="input-podcast-guest-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">Audio File</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Upload the podcast audio file (MP3, WAV, etc.).
                          </p>
                        </div>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={104857600} // 100MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handlePodcastAudioUpload}
                          buttonClassName="flex items-center gap-2"
                        >
                          <AudioWaveform className="h-4 w-4" />
                          {uploadingPodcastAudio ? "Processing..." : "Upload Audio"}
                        </ObjectUploader>
                      </div>
                      {podcastForm.watch("audioUrl") && (
                        <Badge variant="secondary" className="text-xs" data-testid="badge-podcast-audio-uploaded">
                          Audio uploaded successfully
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">Cover Image</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Upload a cover image for the episode.
                          </p>
                        </div>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handlePodcastImageUpload}
                          buttonClassName="flex items-center gap-2"
                        >
                          <Image className="h-4 w-4" />
                          {uploadingPodcastImage ? "Processing..." : "Upload Cover"}
                        </ObjectUploader>
                      </div>
                      {podcastForm.watch("imageUrl") && (
                        <Badge variant="secondary" className="text-xs" data-testid="badge-podcast-image-uploaded">
                          Cover image uploaded successfully
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={createPodcastMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-create-podcast"
                      >
                        <Upload className="h-4 w-4" />
                        {createPodcastMutation.isPending ? "Creating..." : "Create Episode"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}