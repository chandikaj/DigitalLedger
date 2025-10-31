import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Menu, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface MenuSetting {
  id: string;
  menuKey: string;
  menuLabel: string;
  isVisible: boolean;
  displayOrder: number;
  updatedAt: Date;
}

export default function MenuSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: menuSettings = [], isLoading } = useQuery<MenuSetting[]>({
    queryKey: ["/api/menu-settings"],
  });

  const updateMenuMutation = useMutation({
    mutationFn: async ({ menuKey, isVisible }: { menuKey: string; isVisible: boolean }) => {
      return await apiRequest(`/api/admin/menu-settings/${menuKey}`, "PATCH", { isVisible });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Menu visibility updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update menu visibility.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (menuKey: string, currentVisibility: boolean) => {
    updateMenuMutation.mutate({
      menuKey,
      isVisible: !currentVisibility,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-menu-settings-title">
              Navigation Menu Settings
            </h1>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-to-admin">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2" data-testid="button-home">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300" data-testid="text-menu-settings-description">
            Control which menu items are visible to all users in the navigation bar.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-menu-card-title">
              <Menu className="h-5 w-5" />
              Navigation Menu Items
            </CardTitle>
            <CardDescription data-testid="text-menu-card-description">
              Toggle menu items on or off to show or hide them from the navigation bar for all users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {menuSettings.map((setting) => (
                  <div
                    key={setting.menuKey}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`menu-item-${setting.menuKey}`}
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {setting.menuLabel}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Menu key: {setting.menuKey}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-medium ${setting.isVisible ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {setting.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                      <Switch
                        checked={setting.isVisible}
                        onCheckedChange={() => handleToggle(setting.menuKey, setting.isVisible)}
                        disabled={updateMenuMutation.isPending}
                        data-testid={`switch-${setting.menuKey}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Changes to menu visibility will take effect immediately for all users. Hidden menu items will no longer appear in the navigation bar.
          </p>
        </div>
      </div>
    </div>
  );
}
