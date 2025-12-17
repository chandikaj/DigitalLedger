import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Lock, Shield, ArrowLeft } from "lucide-react";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
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
