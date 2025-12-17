import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Lock, Shield, ArrowLeft, Bell, BellOff } from "lucide-react";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

interface NewsCategory {
  id: string;
  name: string;
  color: string;
}

interface Subscriber {
  id: string;
  email: string;
  categories: string[] | null;
  frequency: string;
  isActive: boolean;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingNotifications, setEditingNotifications] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState("weekly");

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<{ subscribed: boolean; subscriber?: Subscriber }>({
    queryKey: ['/api/subscribers/me'],
    enabled: isAuthenticated,
  });

  const { data: categories = [] } = useQuery<NewsCategory[]>({
    queryKey: ['/api/news-categories'],
  });

  useEffect(() => {
    if (subscriptionData?.subscriber) {
      setSelectedCategories(subscriptionData.subscriber.categories || []);
      setSelectedFrequency(subscriptionData.subscriber.frequency || "weekly");
    }
  }, [subscriptionData]);

  const subscriptionMutation = useMutation({
    mutationFn: async (data: { email: string; categories: string[]; frequency: string }) => {
      return await apiRequest("/api/subscribers", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Notification Preferences Updated",
        description: "Your notification settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscribers/me'] });
      setEditingNotifications(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification preferences",
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("/api/auth/change-password", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const onPasswordSubmit = (data: PasswordChangeForm) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSaveNotifications = () => {
    const userData = user as any;
    if (!userData?.email) {
      toast({
        title: "Error",
        description: "Unable to save preferences - email not available",
        variant: "destructive",
      });
      return;
    }
    
    subscriptionMutation.mutate({
      email: userData.email,
      categories: selectedCategories,
      frequency: selectedFrequency,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    setLocation("/login");
    return null;
  }

  const userData = user as any;
  const isSubscribed = subscriptionData?.subscribed;
  const subscriber = subscriptionData?.subscriber;

  const frequencyLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    "bi-weekly": "Bi-Weekly",
    monthly: "Monthly",
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || "#6b7280";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="settings-title">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Card data-testid="card-profile">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>
                Your personal account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16" data-testid="avatar-settings">
                  <AvatarImage src={userData?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white text-xl font-semibold">
                    {userData?.firstName?.[0] || "U"}{userData?.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-fullname">
                    {userData?.firstName} {userData?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize" data-testid="text-role">
                    {userData?.role || "Member"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                    <p className="font-medium text-gray-900 dark:text-white" data-testid="text-email">
                      {userData?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Account Status</p>
                    <p className="font-medium text-green-600 dark:text-green-400" data-testid="text-status">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-notifications">
            <CardHeader>
              <div className="flex items-center space-x-2">
                {isSubscribed ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-gray-400" />
                )}
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>
                Manage your email notification settings for news updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : !editingNotifications ? (
                <div className="space-y-4">
                  {isSubscribed && subscriber ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                          <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-notification-status">
                            Enabled
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Active
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Frequency</p>
                        <p className="font-medium text-gray-900 dark:text-white" data-testid="text-frequency">
                          {frequencyLabels[subscriber.frequency] || subscriber.frequency}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Selected Categories</p>
                        <div className="flex flex-wrap gap-2" data-testid="selected-categories">
                          {subscriber.categories && subscriber.categories.length > 0 ? (
                            subscriber.categories.map(catId => (
                              <Badge
                                key={catId}
                                style={{ backgroundColor: getCategoryColor(catId) }}
                                className="text-white"
                              >
                                {getCategoryName(catId)}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">All categories</p>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setEditingNotifications(true)}
                        variant="outline"
                        className="mt-4"
                        data-testid="button-edit-notifications"
                      >
                        Edit Preferences
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        You haven't set up email notifications yet
                      </p>
                      <Button
                        onClick={() => setEditingNotifications(true)}
                        data-testid="button-enable-notifications"
                      >
                        Enable Notifications
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                      Notification Frequency
                    </label>
                    <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                      Categories (leave empty for all)
                    </label>
                    <div className="space-y-2" data-testid="category-checkboxes">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${category.id}`}
                            checked={selectedCategories.includes(category.id)}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                            data-testid={`checkbox-category-${category.id}`}
                          />
                          <label
                            htmlFor={`cat-${category.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                          >
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <Button
                      onClick={handleSaveNotifications}
                      disabled={subscriptionMutation.isPending}
                      data-testid="button-save-notifications"
                    >
                      {subscriptionMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingNotifications(false);
                        if (subscriber) {
                          setSelectedCategories(subscriber.categories || []);
                          setSelectedFrequency(subscriber.frequency || "weekly");
                        } else {
                          setSelectedCategories([]);
                          setSelectedFrequency("weekly");
                        }
                      }}
                      data-testid="button-cancel-notifications"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-security">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last updated: Never
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPasswordForm(true)}
                    variant="outline"
                    data-testid="button-change-password"
                  >
                    Change Password
                  </Button>
                </div>
              ) : (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your current password"
                              data-testid="input-current-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your new password"
                              data-testid="input-new-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your new password"
                              data-testid="input-confirm-password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3 pt-2">
                      <Button
                        type="submit"
                        disabled={passwordMutation.isPending}
                        data-testid="button-submit-password"
                      >
                        {passwordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordForm(false);
                          passwordForm.reset();
                        }}
                        data-testid="button-cancel-password"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
