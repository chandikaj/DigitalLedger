import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Save, Mic, Image, ArrowLeft, Headphones, Loader2, Trash2, X, Upload } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

const podcastFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  episodeNumber: z.coerce.number().int().positive().optional(),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  duration: z.string().optional(),
  hostName: z.string().optional(),
  guestName: z.string().optional(),
  guestTitle: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

type PodcastFormData = z.infer<typeof podcastFormSchema>;

export default function EditPodcast() {
  const { id } = useParams();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: newsCategories = [] } = useQuery<NewsCategory[]>({
    queryKey: ["/api/news-categories", "active"],
    queryFn: () => fetch("/api/news-categories?activeOnly=true").then(res => res.json()),
  });

  const { data: podcast, isLoading } = useQuery({
    queryKey: ["/api/podcasts", id],
    queryFn: () => fetch(`/api/podcasts/${id}`).then(res => res.json()),
  });

  const podcastForm = useForm<PodcastFormData>({
    resolver: zodResolver(podcastFormSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryIds: [],
      episodeNumber: undefined,
      audioUrl: "",
      imageUrl: "",
      duration: "",
      hostName: "",
      guestName: "",
      guestTitle: "",
      status: "draft",
    },
  });

  // Update form when podcast data loads
  useEffect(() => {
    if (podcast) {
      podcastForm.reset({
        title: podcast.title || "",
        description: podcast.description || "",
        categoryIds: podcast.categories?.map((cat: NewsCategory) => cat.id) || [],
        episodeNumber: podcast.episodeNumber || undefined,
        audioUrl: podcast.audioUrl || "",
        imageUrl: podcast.imageUrl || "",
        duration: podcast.duration || "",
        hostName: podcast.hostName || "",
        guestName: podcast.guestName || "",
        guestTitle: podcast.guestTitle || "",
        status: podcast.status || "draft",
      });
    }
  }, [podcast, podcastForm]);

  const updatePodcastMutation = useMutation({
    mutationFn: async (data: PodcastFormData) => {
      return await apiRequest(`/api/podcasts/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Podcast episode updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts/featured"] });
      setTimeout(() => setLocation("/podcasts"), 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update podcast episode. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating podcast:", error);
    },
  });

  const deletePodcastMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/podcasts/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Podcast episode deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts/featured"] });
      setTimeout(() => setLocation("/podcasts"), 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete podcast episode. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting podcast:", error);
    },
  });


  const onSubmitPodcast = (data: PodcastFormData) => {
    updatePodcastMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
          <p className="text-gray-600 dark:text-gray-300">Loading podcast episode...</p>
        </div>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">Podcast episode not found.</p>
          <Link href="/podcasts">
            <Button>Back to Podcasts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/podcasts">
              <Button variant="ghost" className="flex items-center gap-2 mb-4" data-testid="button-back-to-podcasts">
                <ArrowLeft className="h-4 w-4" />
                Back to Podcasts
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-edit-podcast-title">
              Edit Podcast Episode
            </h1>
            <p className="text-gray-600 dark:text-gray-300" data-testid="text-edit-podcast-description">
              Update the details for this podcast episode.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-podcast-form-title">
                <Headphones className="h-5 w-5" />
                Episode Details
              </CardTitle>
              <CardDescription data-testid="text-podcast-form-description">
                Modify the fields below to update the podcast episode.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...podcastForm}>
                <form onSubmit={podcastForm.handleSubmit(onSubmitPodcast)} className="space-y-6">
                  <FormField
                    control={podcastForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Episode summary and key topics discussed..." 
                            className="resize-none" 
                            rows={6}
                            {...field}
                            value={field.value || ''}
                            data-testid="input-podcast-description"
                          />
                        </FormControl>
                        <FormDescription>
                          A detailed description of the episode content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={podcastForm.control}
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
                          </div>
                        </FormControl>
                        <FormDescription>Select one or more categories for this podcast episode.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={podcastForm.control}
                      name="episodeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Episode Number (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 42" 
                              {...field}
                              value={field.value ?? ''}
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
                          <FormLabel>Duration (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., 45 (minutes)" 
                              {...field}
                              value={field.value || ''}
                              data-testid="input-podcast-duration"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Duration in minutes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={podcastForm.control}
                    name="audioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube Link (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            {...field}
                            value={field.value || ''}
                            data-testid="input-podcast-youtube-url"
                          />
                        </FormControl>
                        <FormDescription>
                          Paste the YouTube video URL for this episode
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Host & Guest Information
                    </h3>

                    <FormField
                      control={podcastForm.control}
                      name="hostName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host Name (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., John Smith" 
                              {...field}
                              value={field.value || ''}
                              data-testid="input-podcast-host-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={podcastForm.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest Name (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Jane Doe" 
                                {...field}
                                value={field.value || ''}
                                data-testid="input-podcast-guest-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={podcastForm.control}
                        name="guestTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guest Title (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., CPA, CFO at Acme Corp" 
                                {...field}
                                value={field.value || ''}
                                data-testid="input-podcast-guest-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={podcastForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Episode Cover Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            {field.value && (
                              <div className="relative">
                                <img 
                                  src={field.value} 
                                  alt="Episode cover" 
                                  className="w-full max-h-64 object-cover rounded-lg"
                                  data-testid="img-podcast-preview"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => {
                                    field.onChange("");
                                    podcastForm.setValue('imageUrl', "", { shouldDirty: true });
                                    setSelectedFileName("");
                                    toast({ title: "Image removed", description: "Episode cover has been cleared." });
                                  }}
                                  data-testid="button-clear-image"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
                              <div className="flex flex-col items-center gap-4">
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div className="text-center space-y-2">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isUploadingImage ? "Uploading..." : "Upload Episode Cover"}
                                  </p>
                                  {selectedFileName && !isUploadingImage && (
                                    <p className="text-xs text-green-600 dark:text-green-400">Selected: {selectedFileName}</p>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    data-testid="input-upload-image"
                                    disabled={isUploadingImage}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setSelectedFileName(file.name);
                                      if (file.size > 5242880) {
                                        toast({ title: "File too large", description: "Image must be less than 5MB", variant: "destructive" });
                                        setSelectedFileName("");
                                        e.target.value = '';
                                        return;
                                      }
                                      if (!file.type.startsWith('image/')) {
                                        toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
                                        setSelectedFileName("");
                                        e.target.value = '';
                                        return;
                                      }
                                      try {
                                        setIsUploadingImage(true);
                                        const uploadParams = await apiRequest("/api/objects/upload", "POST", {
                                          purpose: "image",
                                        });
                                        const uploadResponse = await fetch(uploadParams.uploadURL, {
                                          method: "PUT",
                                          body: file,
                                          headers: { "Content-Type": file.type },
                                        });
                                        if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.statusText}`);
                                        const aclResponse = await apiRequest("/api/articles/images", "PUT", {
                                          imageURL: uploadParams.uploadURL.split('?')[0],
                                        });
                                        const publicURL = `/public-objects${aclResponse.objectPath}`;
                                        field.onChange(publicURL);
                                        podcastForm.setValue('imageUrl', publicURL, { shouldDirty: true, shouldValidate: true });
                                        toast({ title: "Success", description: `${file.name} uploaded successfully!` });
                                        e.target.value = '';
                                      } catch (error) {
                                        toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "Failed to upload image", variant: "destructive" });
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
                        <FormDescription>Upload a cover image for your podcast episode. Recommended size: 1200×630px.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={podcastForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publication Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-podcast-status">
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
                          Draft episodes are only visible to editors and admins.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center gap-3 pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          type="button"
                          variant="destructive"
                          className="flex items-center gap-2"
                          disabled={deletePodcastMutation.isPending}
                          data-testid="button-delete-podcast"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletePodcastMutation.isPending ? "Deleting..." : "Delete Episode"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Podcast Episode</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this podcast episode? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deletePodcastMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <div className="flex gap-3">
                      <Link href="/podcasts">
                        <Button 
                          type="button"
                          variant="outline"
                          data-testid="button-cancel-podcast"
                        >
                          Cancel
                        </Button>
                      </Link>
                      <Button 
                        type="submit" 
                        disabled={updatePodcastMutation.isPending}
                        className="flex items-center gap-2"
                        data-testid="button-update-podcast"
                      >
                        <Save className="h-4 w-4" />
                        {updatePodcastMutation.isPending ? "Updating..." : "Update Episode"}
                      </Button>
                    </div>
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
