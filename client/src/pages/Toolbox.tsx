import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ExternalLink, 
  Plus, 
  Edit2, 
  Trash2,
  Wrench,
  Rocket,
  FlaskConical,
  TestTube,
  CheckCircle2,
  Calculator,
  TrendingUp,
  Upload,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import type { ToolboxApp } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  developing: { label: "Developing", color: "bg-gray-500", icon: Wrench },
  testing: { label: "Testing", color: "bg-yellow-500", icon: TestTube },
  beta_ready: { label: "Beta Ready", color: "bg-blue-500", icon: FlaskConical },
  ready_for_commercial_use: { label: "Ready for Commercial Use", color: "bg-green-500", icon: CheckCircle2 },
};

const sectionConfig: Record<string, { title: string; description: string; icon: any }> = {
  controller: { 
    title: "Controller Toolbox", 
    description: "Apps and tools to boost productivity for Controllers",
    icon: Calculator
  },
  fpa: { 
    title: "Financial Planning & Analysis Toolbox", 
    description: "Tools designed for FP&A professionals",
    icon: TrendingUp
  },
};

export default function Toolbox() {
  const { user } = useAuth() as { user: any };
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ToolboxApp | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  
  const isAdmin = user?.role === 'admin' || user?.role === 'editor';

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    link: "",
    imageUrl: "",
    section: "controller",
    status: "developing",
    displayOrder: 0,
    isActive: true,
  });

  const { data: apps, isLoading } = useQuery<ToolboxApp[]>({
    queryKey: ["/api/toolbox"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/toolbox", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toolbox"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "App added successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add app",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest(`/api/toolbox/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toolbox"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "App updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update app",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/toolbox/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/toolbox"] });
      setIsDeleteDialogOpen(false);
      setSelectedApp(null);
      toast({
        title: "Success",
        description: "App deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete app",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      link: "",
      imageUrl: "",
      section: "controller",
      status: "developing",
      displayOrder: 0,
      isActive: true,
    });
    setIsEditing(false);
    setSelectedApp(null);
    setSelectedFileName("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

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

    setIsUploadingImage(true);

    try {
      const uploadResponse = await apiRequest("/api/objects/upload", "POST") as { uploadURL: string };
      const uploadURL = uploadResponse.uploadURL;

      await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      const aclResponse = await apiRequest("/api/toolbox/images", "PUT", {
        imageURL: uploadURL,
      }) as { objectPath: string };

      const publicURL = `/public-objects${aclResponse.objectPath}`;
      setFormData(prev => ({ ...prev, imageUrl: publicURL }));
      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setSelectedFileName("");
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleOpenNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (app: ToolboxApp) => {
    setSelectedApp(app);
    setFormData({
      name: app.name,
      description: app.description,
      link: app.link,
      imageUrl: app.imageUrl || "",
      section: app.section || "controller",
      status: app.status,
      displayOrder: app.displayOrder || 0,
      isActive: app.isActive ?? true,
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (app: ToolboxApp) => {
    setSelectedApp(app);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedApp) {
      updateMutation.mutate({ id: selectedApp.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.developing;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const controllerApps = apps?.filter(app => app.section === 'controller' || !app.section) || [];
  const fpaApps = apps?.filter(app => app.section === 'fpa') || [];

  const renderAppCard = (app: ToolboxApp) => (
    <Card 
      key={app.id} 
      className="overflow-hidden hover:shadow-lg transition-shadow duration-200"
      data-testid={`card-app-${app.id}`}
    >
      <div className="relative">
        {app.imageUrl ? (
          <img
            src={app.imageUrl}
            alt={app.name}
            className="w-full h-40 object-cover"
            data-testid={`img-app-${app.id}`}
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Wrench className="w-16 h-16 text-primary/50" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {getStatusBadge(app.status)}
        </div>
        {!app.isActive && isAdmin && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary">Inactive</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2" data-testid={`text-app-name-${app.id}`}>
          {app.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3" data-testid={`text-app-description-${app.id}`}>
          {app.description}
        </p>
        <div className="flex items-center justify-between">
          <a
            href={app.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
            data-testid={`link-app-${app.id}`}
          >
            <ExternalLink className="w-4 h-4" />
            Visit App
          </a>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(app)}
                data-testid={`button-edit-${app.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(app)}
                className="text-red-500 hover:text-red-600"
                data-testid={`button-delete-${app.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSection = (sectionKey: string, sectionApps: ToolboxApp[]) => {
    const config = sectionConfig[sectionKey];
    const Icon = config.icon;
    
    return (
      <div className="mb-12" key={sectionKey}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`section-title-${sectionKey}`}>
              {config.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {config.description}
            </p>
          </div>
        </div>
        
        {sectionApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectionApps.map(renderAppCard)}
          </div>
        ) : (
          <Card className="p-8 text-center bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col items-center gap-2">
              <Icon className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                No apps available in this section yet.
              </p>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3" data-testid="page-title">
                <Rocket className="w-8 h-8 text-primary" />
                Toolbox
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Discover apps and tools to boost your productivity
              </p>
            </div>
            
            {isAdmin && (
              <Button onClick={handleOpenNew} className="flex items-center gap-2" data-testid="button-add-app">
                <Plus className="w-4 h-4" />
                Add App
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-12">
              {[1, 2].map((section) => (
                <div key={section}>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {renderSection('controller', controllerApps)}
              {renderSection('fpa', fpaApps)}
            </>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit App" : "Add New App"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the app details below." : "Fill in the details to add a new app to the toolbox."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">App Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., QuickBooks Integration"
                required
                data-testid="input-app-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this app does..."
                rows={3}
                required
                data-testid="input-app-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">App Link *</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
                required
                data-testid="input-app-link"
              />
            </div>

            <div className="space-y-2">
              <Label>App Image</Label>
              {formData.imageUrl && (
                <div className="relative">
                  <img 
                    src={formData.imageUrl} 
                    alt="App preview" 
                    className="w-full max-h-40 object-cover rounded-lg"
                    data-testid="img-app-preview"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setFormData({ ...formData, imageUrl: "" });
                      setSelectedFileName("");
                    }}
                    data-testid="button-clear-image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-gray-400" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isUploadingImage ? "Uploading..." : "Upload App Image"}
                    </p>
                    {selectedFileName && !isUploadingImage && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Uploaded: {selectedFileName}
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleImageUpload}
                      className="hidden"
                      id="toolbox-image-upload"
                      data-testid="input-upload-image"
                    />
                    <label
                      htmlFor="toolbox-image-upload"
                      className={`inline-block px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${
                        isUploadingImage 
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {isUploadingImage ? "Uploading..." : "Choose File"}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max file size: 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section">Section *</Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger data-testid="select-app-section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="controller">Controller Toolbox</SelectItem>
                    <SelectItem value="fpa">FP&A Toolbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger data-testid="select-app-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developing">Developing</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="beta_ready">Beta Ready</SelectItem>
                    <SelectItem value="ready_for_commercial_use">Ready for Commercial Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-app-order"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4"
                  data-testid="checkbox-app-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-app"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Saving..." 
                  : isEditing ? "Update App" : "Add App"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedApp?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedApp && deleteMutation.mutate(selectedApp.id)}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
