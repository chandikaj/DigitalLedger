import { Link, useLocation } from "wouter";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Moon, 
  Sun, 
  Brain,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/auth/logout", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear(); // Clear all cached data
      setLocation("/login"); // Redirect to login page
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const baseNavigation = [
    { name: "News", href: "/news" },
    { name: "Podcasts", href: "/podcasts" },
    { name: "Forums", href: "/forums" },
    { name: "Resources", href: "/resources" },
    { name: "Community", href: "/community" },
  ];

  // Only show Admin link if user is authenticated and is an admin
  const navigation = isAuthenticated && (user as any)?.role === "admin"
    ? [...baseNavigation, { name: "Admin", href: "/admin" }]
    : baseNavigation;

  const isActive = (href: string) => location === href;

  return (
    <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50" data-testid="navigation-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                <Brain className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">The Digital Ledger</h1>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                data-testid={`link-${item.name.toLowerCase()}`}
                className={cn(
                  "font-medium transition-colors",
                  isActive(item.href)
                    ? "text-primary dark:text-ai-teal"
                    : "text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-ai-teal"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Search - hidden on mobile */}
            <div className="relative hidden lg:block">
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-10"
                data-testid="input-search"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              className="rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-gray-600" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-400" />
              )}
            </Button>

            {/* User Profile or Auth */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8" data-testid="avatar-user">
                  <AvatarImage src={(user as any)?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white text-sm font-semibold">
                    {(user as any)?.firstName?.[0] || "U"}{(user as any)?.lastName?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium" data-testid="text-username">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                  className="hidden sm:inline-flex"
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setLocation("/login")}
                data-testid="button-login"
                className="bg-primary hover:bg-blue-700 text-white"
              >
                Login
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4" data-testid="mobile-menu">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`link-mobile-${item.name.toLowerCase()}`}
                  className={cn(
                    "px-3 py-2 rounded-md font-medium transition-colors",
                    isActive(item.href)
                      ? "text-primary dark:text-ai-teal bg-primary/10 dark:bg-ai-teal/10"
                      : "text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-ai-teal hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile search */}
              <div className="px-3 py-2">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-10"
                    data-testid="input-mobile-search"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Mobile auth buttons */}
              {isAuthenticated && user && (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-mobile-logout"
                  className="mx-3 justify-start"
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
