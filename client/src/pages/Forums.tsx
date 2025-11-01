import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
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
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Star
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Forums() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<any>(null);
  const userRole = (user as any)?.role;
  const isEditorOrAdmin = userRole === 'editor' || userRole === 'admin';
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    categoryId: "",
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ discussionId, newStatus }: { discussionId: string; newStatus: string }) => {
      return await apiRequest(`/api/forum/discussions/${discussionId}/status`, 'PATCH', { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      toast({
        title: "Status updated",
        description: `Discussion ${variables.newStatus === 'published' ? 'published' : 'set to draft'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update discussion status.",
        variant: "destructive",
      });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ discussionId, isFeatured }: { discussionId: string; isFeatured: boolean }) => {
      return await apiRequest(`/api/forum/discussions/${discussionId}/featured`, 'PATCH', { isFeatured });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions/featured"] });
      toast({
        title: "Featured status updated",
        description: `Discussion ${variables.isFeatured ? 'marked as featured' : 'unmarked as featured'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update featured status.",
        variant: "destructive",
      });
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/forum/categories"],
  });

  const { data: discussions, isLoading: discussionsLoading } = useQuery({
    queryKey: ["/api/forum/discussions", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/forum/discussions?categoryId=${selectedCategory}&limit=50`
        : "/api/forum/discussions?limit=50";
      const response = await fetch(url);
      return response.json();
    },
  });

  const filteredDiscussions = discussions?.filter((discussion: any) =>
    discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    discussion.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Create discussion mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/forum/discussions", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forum/categories"] });
      setIsNewDialogOpen(false);
      setFormData({ title: "", content: "", categoryId: "" });
      toast({
        title: "Success",
        description: "Discussion created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create discussion",
        variant: "destructive",
      });
    },
  });

  // Update discussion mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/forum/discussions/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      setIsEditDialogOpen(false);
      setSelectedDiscussion(null);
      toast({
        title: "Success",
        description: "Discussion updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update discussion",
        variant: "destructive",
      });
    },
  });

  // Delete discussion mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/forum/discussions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/discussions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/forum/categories"] });
      setIsDeleteDialogOpen(false);
      setSelectedDiscussion(null);
      toast({
        title: "Success",
        description: "Discussion deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete discussion",
        variant: "destructive",
      });
    },
  });

  const handleNewDiscussion = () => {
    setFormData({ title: "", content: "", categoryId: "" });
    setIsNewDialogOpen(true);
  };

  const handleEditDiscussion = (discussion: any) => {
    setSelectedDiscussion(discussion);
    setFormData({
      title: discussion.title,
      content: discussion.content,
      categoryId: discussion.category?.id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteDiscussion = (discussion: any) => {
    setSelectedDiscussion(discussion);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitNew = () => {
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    updateMutation.mutate({
      id: selectedDiscussion.id,
      ...formData,
    });
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(selectedDiscussion.id);
  };

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

  const isAdmin = (user as any)?.role === 'admin';

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
              onClick={handleNewDiscussion}
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
            {(categories as any[])?.map((category: any) => (
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
                (categories as any[])?.find((cat: any) => cat.id === selectedCategory)?.name + " Discussions" : 
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
                  <Button className="mt-4" onClick={handleNewDiscussion} data-testid="button-start-first-discussion">
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
                    onClick={(e) => {
                      // Don't navigate if clicking edit/delete buttons
                      if ((e.target as HTMLElement).closest('button')) return;
                      setLocation(`/forums/${discussion.id}`);
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={discussion.author?.profileImageUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {discussion.author?.firstName?.[0]}{discussion.author?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3 flex-wrap">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1 hover:text-primary transition-colors" data-testid={`discussion-title-${discussion.id}`}>
                              {discussion.title}
                            </h3>
                            {discussion.isPinned && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                Pinned
                              </Badge>
                            )}
                            {isEditorOrAdmin && (
                              <Badge 
                                variant={discussion.status === 'published' ? 'default' : 'outline'}
                                className={discussion.status === 'published' ? 'bg-green-500 text-white' : 'border-amber-500 text-amber-600 dark:text-amber-400'}
                                data-testid={`status-${discussion.id}`}
                              >
                                {discussion.status === 'published' ? 'Published' : 'Draft'}
                              </Badge>
                            )}
                          </div>
                          
                          {isEditorOrAdmin && (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant={discussion.status === 'published' ? 'outline' : 'default'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatusMutation.mutate({
                                    discussionId: discussion.id,
                                    newStatus: discussion.status === 'published' ? 'draft' : 'published'
                                  });
                                }}
                                disabled={toggleStatusMutation.isPending}
                                data-testid={`toggle-status-${discussion.id}`}
                                className="flex items-center gap-1"
                              >
                                {discussion.status === 'published' ? (
                                  <>
                                    <XCircle className="h-4 w-4" />
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant={discussion.isFeatured ? 'default' : 'outline'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFeaturedMutation.mutate({
                                    discussionId: discussion.id,
                                    isFeatured: !discussion.isFeatured
                                  });
                                }}
                                disabled={toggleFeaturedMutation.isPending}
                                data-testid={`toggle-featured-${discussion.id}`}
                                className="flex items-center gap-1"
                              >
                                <Star className={`h-4 w-4 ${discussion.isFeatured ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditDiscussion(discussion)}
                                data-testid={`button-edit-discussion-${discussion.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDiscussion(discussion)}
                                data-testid={`button-delete-discussion-${discussion.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2" data-testid={`discussion-content-${discussion.id}`}>
                          {discussion.content}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {discussion.author?.firstName} {discussion.author?.lastName}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {discussion.replyCount || 0} replies
                          </span>
                          <span className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {discussion.likes || 0} likes
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {discussion.lastReplyAt ? timeAgo(discussion.lastReplyAt) : timeAgo(discussion.createdAt)}
                          </span>
                          {discussion.category && (
                            <Badge variant="outline" className="ml-auto">
                              {discussion.category.name}
                            </Badge>
                          )}
                          {discussion.newsCategories && discussion.newsCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {discussion.newsCategories.map((cat: any) => (
                                <Badge 
                                  key={cat.id}
                                  variant="secondary"
                                  className="text-xs"
                                  style={{ backgroundColor: cat.color + '20', color: cat.color }}
                                  data-testid={`news-category-${discussion.id}-${cat.slug}`}
                                >
                                  {cat.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Discussion Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start a New Discussion</DialogTitle>
            <DialogDescription>
              Share your thoughts, ask questions, or start a conversation with the community.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter discussion title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-new-discussion-title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger data-testid="select-new-discussion-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories as any[])?.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="What would you like to discuss?"
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                data-testid="textarea-new-discussion-content"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitNew} 
              disabled={createMutation.isPending || !formData.title || !formData.content || !formData.categoryId}
              data-testid="button-submit-new-discussion"
            >
              {createMutation.isPending ? "Creating..." : "Create Discussion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Discussion Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Discussion</DialogTitle>
            <DialogDescription>
              Make changes to your discussion.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter discussion title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-edit-discussion-title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={formData.categoryId} 
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger data-testid="select-edit-discussion-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories as any[])?.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="What would you like to discuss?"
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                data-testid="textarea-edit-discussion-content"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEdit} 
              disabled={updateMutation.isPending || !formData.title || !formData.content || !formData.categoryId}
              data-testid="button-submit-edit-discussion"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discussion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDiscussion?.title}"? This will also delete all replies. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-discussion">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete-discussion"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
