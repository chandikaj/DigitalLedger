import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  BookOpen, 
  Video, 
  ClipboardList, 
  Award,
  Clock,
  Star,
  Download,
  Filter,
  Plus,
  Edit2,
  Trash2
} from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Resources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    category: "",
    url: "",
    imageUrl: "",
    duration: "",
    difficulty: "",
    isFree: true,
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["/api/resources", selectedType, selectedCategory],
    queryFn: async () => {
      let url = "/api/resources?limit=50";
      if (selectedType !== "all") url += `&type=${selectedType}`;
      if (selectedCategory !== "all") url += `&category=${selectedCategory}`;
      const response = await fetch(url);
      return response.json();
    },
  });

  // Create resource mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/resources", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setIsNewDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        type: "",
        category: "",
        url: "",
        imageUrl: "",
        duration: "",
        difficulty: "",
        isFree: true,
      });
      toast({
        title: "Success",
        description: "Resource created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create resource",
        variant: "destructive",
      });
    },
  });

  // Update resource mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/resources/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setIsEditDialogOpen(false);
      setSelectedResource(null);
      toast({
        title: "Success",
        description: "Resource updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update resource",
        variant: "destructive",
      });
    },
  });

  // Delete resource mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/resources/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setIsDeleteDialogOpen(false);
      setSelectedResource(null);
      toast({
        title: "Success",
        description: "Resource deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete resource",
        variant: "destructive",
      });
    },
  });

  const resourceTypes = [
    { id: "all", label: "All Resources", icon: <Filter className="h-4 w-4" /> },
    { id: "ebook", label: "eBooks & Guides", icon: <BookOpen className="h-4 w-4" /> },
    { id: "webinar", label: "Webinars", icon: <Video className="h-4 w-4" /> },
    { id: "case-study", label: "Case Studies", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "certification", label: "Certifications", icon: <Award className="h-4 w-4" /> },
  ];

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "taxation", label: "Taxation" },
    { id: "financial-reporting", label: "Financial Reporting" },
    { id: "audit-automation", label: "Audit Automation" },
    { id: "ethical-ai", label: "Ethical AI" },
  ];

  const difficultyLevels = [
    { id: "beginner", label: "Beginner" },
    { id: "intermediate", label: "Intermediate" },
    { id: "advanced", label: "Advanced" },
  ];

  const filteredResources = resources?.filter((resource: any) =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleNewResource = () => {
    setFormData({
      title: "",
      description: "",
      type: "",
      category: "",
      url: "",
      imageUrl: "",
      duration: "",
      difficulty: "",
      isFree: true,
    });
    setIsNewDialogOpen(true);
  };

  const handleEditResource = (resource: any) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title || "",
      description: resource.description || "",
      type: resource.type || "",
      category: resource.category || "",
      url: resource.url || "",
      imageUrl: resource.imageUrl || "",
      duration: resource.duration || "",
      difficulty: resource.difficulty || "",
      isFree: resource.isFree !== false,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteResource = (resource: any) => {
    setSelectedResource(resource);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitNew = () => {
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    updateMutation.mutate({
      id: selectedResource.id,
      ...formData,
    });
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(selectedResource.id);
  };

  const getTypeIcon = (type: string) => {
    const typeObj = resourceTypes.find(t => t.id === type);
    return typeObj?.icon || <BookOpen className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ebook":
        return "bg-primary/10 text-primary dark:bg-ai-teal/10 dark:text-ai-teal";
      case "webinar":
        return "bg-secondary/10 text-secondary dark:bg-ai-teal/10 dark:text-ai-teal";
      case "case-study":
        return "bg-accent/10 text-accent";
      case "certification":
        return "bg-ai-teal/10 text-ai-teal";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const isAdmin = (user as any)?.role === 'admin';

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12" data-testid="resources-header">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Educational Resources
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl">
              Access comprehensive learning materials, case studies, and certification paths to advance your AI accounting expertise
            </p>
          </div>
          
          {isAdmin && (
            <Button 
              className="mt-4 md:mt-0"
              onClick={handleNewResource}
              data-testid="button-new-resource"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Resource
            </Button>
          )}
        </div>

        {/* Resource Type Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" data-testid="resource-stats">
          {resourceTypes.slice(1).map((type) => {
            const count = resources?.filter((r: any) => r.type === type.id).length || 0;
            return (
              <div key={type.id} className="text-center" data-testid={`stat-${type.id}`}>
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 ${getTypeColor(type.id)}`}>
                  {type.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{type.label}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  Comprehensive {type.label.toLowerCase()} collection
                </p>
                <span className="text-primary dark:text-ai-teal font-medium text-sm">
                  {count} resources
                </span>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8" data-testid="resource-filters">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource Type
              </label>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map((type) => (
                  <Button
                    key={type.id}
                    size="sm"
                    variant={selectedType === type.id ? "default" : "outline"}
                    onClick={() => setSelectedType(type.id)}
                    data-testid={`filter-type-${type.id}`}
                  >
                    {type.icon}
                    <span className="ml-2">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-resources"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="resources-grid">
          {filteredResources.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No resources found matching your criteria.
              </p>
            </div>
          ) : (
            filteredResources.map((resource: any) => (
              <Card 
                key={resource.id} 
                className="hover:shadow-lg transition-shadow overflow-hidden"
                data-testid={`resource-card-${resource.id}`}
              >
                {/* Resource Image */}
                {resource.imageUrl && (
                  <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
                    <img 
                      src={resource.imageUrl} 
                      alt={resource.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <CardContent className="p-6">
                  {/* Type & Free Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={getTypeColor(resource.type)}>
                      {resourceTypes.find(t => t.id === resource.type)?.label}
                    </Badge>
                    {resource.isFree && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        FREE
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
                    {resource.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {resource.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-500 dark:text-gray-400">
                    {resource.duration && (
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {resource.duration}
                      </span>
                    )}
                    {resource.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {resource.difficulty}
                      </Badge>
                    )}
                    {resource.rating > 0 && (
                      <span className="flex items-center">
                        <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                        {resource.rating}/5
                      </span>
                    )}
                  </div>

                  {/* Category & Downloads */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{categories.find(c => c.id === resource.category)?.label}</span>
                    <span className="flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      {resource.downloadCount || 0}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => window.open(resource.url, '_blank')}
                      data-testid={`button-access-${resource.id}`}
                    >
                      Access Resource
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditResource(resource)}
                          data-testid={`button-edit-${resource.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteResource(resource)}
                          data-testid={`button-delete-${resource.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* New Resource Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>
              Create a new educational resource for the community.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Resource title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-new-resource-title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the resource..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="textarea-new-resource-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-new-resource-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.slice(1).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="select-new-resource-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Resource URL</label>
              <Input
                placeholder="https://example.com/resource"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                data-testid="input-new-resource-url"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                data-testid="input-new-resource-image"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duration (optional)</label>
                <Input
                  placeholder="e.g., 60 minutes, 40 hours"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  data-testid="input-new-resource-duration"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Difficulty</label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger data-testid="select-new-resource-difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFree"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                className="rounded"
                data-testid="checkbox-new-resource-free"
              />
              <label htmlFor="isFree" className="text-sm font-medium">
                This resource is free
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitNew} 
              disabled={createMutation.isPending || !formData.title || !formData.type || !formData.category}
              data-testid="button-submit-new-resource"
            >
              {createMutation.isPending ? "Creating..." : "Create Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription>
              Make changes to the resource.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Resource title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-edit-resource-title"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the resource..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="textarea-edit-resource-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger data-testid="select-edit-resource-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceTypes.slice(1).map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="select-edit-resource-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Resource URL</label>
              <Input
                placeholder="https://example.com/resource"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                data-testid="input-edit-resource-url"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                data-testid="input-edit-resource-image"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Duration (optional)</label>
                <Input
                  placeholder="e.g., 60 minutes, 40 hours"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  data-testid="input-edit-resource-duration"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Difficulty</label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger data-testid="select-edit-resource-difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFreeEdit"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                className="rounded"
                data-testid="checkbox-edit-resource-free"
              />
              <label htmlFor="isFreeEdit" className="text-sm font-medium">
                This resource is free
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEdit} 
              disabled={updateMutation.isPending || !formData.title || !formData.type || !formData.category}
              data-testid="button-submit-edit-resource"
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
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedResource?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-resource">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete-resource"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
