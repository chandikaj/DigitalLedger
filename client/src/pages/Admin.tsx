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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { insertNewsArticleSchema, insertPodcastEpisodeSchema, insertUserInvitationSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { Upload, FileText, Mic, Image, AudioWaveform, Users, UserPlus, Shield, ShieldCheck, Edit, Trash2, AlertCircle } from "lucide-react";
import type { UploadResult } from "@uppy/core";

// Extended schemas for form validation
const articleFormSchema = insertNewsArticleSchema.extend({
  imageFile: z.string().optional(),
}).partial();

const podcastFormSchema = insertPodcastEpisodeSchema.extend({
  audioFile: z.string().optional(),
  coverImageFile: z.string().optional(),
}).partial();

const inviteFormSchema = insertUserInvitationSchema.pick({
  email: true,
  role: true,
});

const userFormSchema = insertUserSchema.extend({
  profileImageFile: z.string().optional(),
});

type ArticleFormData = z.infer<typeof articleFormSchema>;
type PodcastFormData = z.infer<typeof podcastFormSchema>;
type InviteFormData = z.infer<typeof inviteFormSchema>;
type UserFormData = z.infer<typeof userFormSchema>;

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
  const [uploadingUserImage, setUploadingUserImage] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
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

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      title: "",
      company: "",
      bio: "",
      role: "member",
      isActive: true,
      profileImageUrl: "",
      expertiseTags: [],
      points: 0,
      badges: [],
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

  // User management queries
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<any[]>({
    queryKey: ["/api/users/invitations"],
  });

  // User management mutations
  const createInvitationMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      return await apiRequest("/api/users/invite", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User invitation sent successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/invitations"] });
      inviteForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating invitation:", error);
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest(`/api/users/${userId}/role`, "PATCH", { role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
      console.error("Error updating role:", error);
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest(`/api/users/${userId}/status`, "PATCH", { isActive });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User status updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status.",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest(`/api/users/invitations/${invitationId}/revoke`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invitation revoked successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/invitations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to revoke invitation.",
        variant: "destructive",
      });
      console.error("Error revoking invitation:", error);
    },
  });

  // Direct user management mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest("/api/users/create", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      userForm.reset();
      setShowCreateUser(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating user:", error);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserFormData> }) => {
      return await apiRequest(`/api/users/${userId}`, "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
      console.error("Error updating user:", error);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
      console.error("Error deleting user:", error);
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

  const onSubmitInvite = (data: InviteFormData) => {
    createInvitationMutation.mutate(data);
  };

  const handleRoleChange = (userId: string, role: string) => {
    changeRoleMutation.mutate({ userId, role });
  };

  const handleStatusToggle = (userId: string, isActive: boolean) => {
    toggleUserStatusMutation.mutate({ userId, isActive });
  };

  const handleRevokeInvitation = (invitationId: string) => {
    revokeInvitationMutation.mutate(invitationId);
  };

  const onSubmitCreateUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    userForm.reset({
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      title: user.title || "",
      company: user.company || "",
      bio: user.bio || "",
      role: user.role || "member",
      isActive: user.isActive ?? true,
      profileImageUrl: user.profileImageUrl || "",
      expertiseTags: user.expertiseTags || [],
      points: user.points || 0,
      badges: user.badges || [],
    });
  };

  const onSubmitEditUser = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, data });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleUserImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        setUploadingUserImage(true);
        const response = await apiRequest("/api/articles/images", "PUT", {
          imageURL: uploadURL,
        }) as { objectPath: string };
        userForm.setValue("profileImageUrl", response.objectPath);
        toast({
          title: "Success",
          description: "Profile image uploaded successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to process uploaded image.",
          variant: "destructive",
        });
        console.error("Error processing image upload:", error);
      } finally {
        setUploadingUserImage(false);
      }
    }
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="articles" className="flex items-center gap-2" data-testid="tab-articles">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="flex items-center gap-2" data-testid="tab-podcasts">
              <Mic className="h-4 w-4" />
              Podcasts
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              Users
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

          <TabsContent value="users">
            <div className="space-y-6">
              {/* Password Management Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Password Management Note</AlertTitle>
                <AlertDescription>
                  This platform uses Replit authentication (OIDC). User passwords are managed by Replit, not through this admin panel. 
                  Users can change their passwords through their Replit account settings.
                </AlertDescription>
              </Alert>

              {/* User Management Actions */}
              <div className="flex gap-4">
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" data-testid="button-create-user">
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account directly (no invitation required).
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onSubmitCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} value={field.value || ''} data-testid="input-user-firstname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} value={field.value || ''} data-testid="input-user-lastname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ''} data-testid="input-user-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Accounting Manager" {...field} value={field.value || ''} data-testid="input-user-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABC Corp" {...field} value={field.value || ''} data-testid="input-user-company" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Brief professional bio..." {...field} value={field.value || ''} data-testid="input-user-bio" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'member'}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-user-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Active Status</FormLabel>
                                  <FormDescription>
                                    User can access the platform
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value || false}
                                    onChange={field.onChange}
                                    data-testid="checkbox-user-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium">Profile Image</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload a profile image for the user.
                              </p>
                            </div>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880} // 5MB
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleUserImageUpload}
                              buttonClassName="flex items-center gap-2"
                            >
                              <Image className="h-4 w-4" />
                              {uploadingUserImage ? "Processing..." : "Upload Image"}
                            </ObjectUploader>
                          </div>
                          {userForm.watch("profileImageUrl") && (
                            <Badge variant="secondary" className="text-xs" data-testid="badge-user-image-uploaded">
                              Profile image uploaded successfully
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Invite Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid="text-invite-form-title">
                    <UserPlus className="h-5 w-5" />
                    Invite New User (Alternative)
                  </CardTitle>
                  <CardDescription data-testid="text-invite-form-description">
                    Send an email invitation to add a user to the Digital Ledger community.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(onSubmitInvite)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={inviteForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="user@example.com" 
                                  {...field} 
                                  data-testid="input-invite-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={inviteForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-invite-role">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="moderator">Moderator</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          disabled={createInvitationMutation.isPending}
                          className="flex items-center gap-2"
                          data-testid="button-send-invite"
                        >
                          <UserPlus className="h-4 w-4" />
                          {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Current Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid="text-users-table-title">
                    <Users className="h-5 w-5" />
                    Current Users
                  </CardTitle>
                  <CardDescription data-testid="text-users-table-description">
                    Manage existing users, their roles, and account status.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="text-center py-4" data-testid="loading-users">Loading users...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell data-testid={`text-user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </TableCell>
                            <TableCell data-testid={`text-user-role-${user.id}`}>
                              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'moderator' ? 'secondary' : 'outline'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-user-status-${user.id}`}>
                              <Badge variant={user.isActive ? 'default' : 'destructive'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      data-testid={`button-change-role-${user.id}`}
                                    >
                                      <Shield className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Change User Role</DialogTitle>
                                      <DialogDescription>
                                        Update the role for {user.firstName} {user.lastName} ({user.email})
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <Select 
                                        defaultValue={user.role}
                                        onValueChange={(role) => handleRoleChange(user.id, role)}
                                      >
                                        <SelectTrigger data-testid={`select-user-role-${user.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="member">Member</SelectItem>
                                          <SelectItem value="moderator">Moderator</SelectItem>
                                          <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <Button
                                  variant={user.isActive ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => handleStatusToggle(user.id, !user.isActive)}
                                  disabled={toggleUserStatusMutation.isPending}
                                  data-testid={`button-toggle-status-${user.id}`}
                                >
                                  {user.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                                
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4" data-testid="empty-users">
                              No users found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Edit User Dialog */}
              {editingUser && (
                <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit User</DialogTitle>
                      <DialogDescription>
                        Update user information for {editingUser.firstName} {editingUser.lastName}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onSubmitEditUser)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} value={field.value || ''} data-testid="input-edit-user-firstname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} value={field.value || ''} data-testid="input-edit-user-lastname" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ''} data-testid="input-edit-user-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Accounting Manager" {...field} value={field.value || ''} data-testid="input-edit-user-title" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABC Corp" {...field} value={field.value || ''} data-testid="input-edit-user-company" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={userForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Brief professional bio..." {...field} value={field.value || ''} data-testid="input-edit-user-bio" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={userForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'member'}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-user-role">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Active Status</FormLabel>
                                  <FormDescription>
                                    User can access the platform
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value || false}
                                    onChange={field.onChange}
                                    data-testid="checkbox-edit-user-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium">Profile Image</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Upload a new profile image for the user.
                              </p>
                            </div>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880} // 5MB
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleUserImageUpload}
                              buttonClassName="flex items-center gap-2"
                            >
                              <Image className="h-4 w-4" />
                              {uploadingUserImage ? "Processing..." : "Update Image"}
                            </ObjectUploader>
                          </div>
                          {userForm.watch("profileImageUrl") && (
                            <Badge variant="secondary" className="text-xs" data-testid="badge-edit-user-image-uploaded">
                              Profile image updated successfully
                            </Badge>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateUserMutation.isPending} data-testid="button-submit-edit-user">
                            {updateUserMutation.isPending ? "Updating..." : "Update User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}

              {/* Pending Invitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid="text-invitations-table-title">
                    <UserPlus className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription data-testid="text-invitations-table-description">
                    View and manage pending user invitations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="text-center py-4" data-testid="loading-invitations">Loading invitations...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited On</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation: any) => (
                          <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                            <TableCell data-testid={`text-invitation-email-${invitation.id}`}>
                              {invitation.email}
                            </TableCell>
                            <TableCell data-testid={`text-invitation-role-${invitation.id}`}>
                              <Badge variant={invitation.role === 'admin' ? 'default' : invitation.role === 'moderator' ? 'secondary' : 'outline'}>
                                {invitation.role}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-invitation-date-${invitation.id}`}>
                              {new Date(invitation.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevokeInvitation(invitation.id)}
                                disabled={revokeInvitationMutation.isPending}
                                data-testid={`button-revoke-invitation-${invitation.id}`}
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {invitations.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4" data-testid="empty-invitations">
                              No pending invitations.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}