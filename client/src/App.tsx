import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { RouteSeoMetadata } from "@/components/SeoMetadata";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

const Login = lazy(() => import("@/pages/Login"));
const Logout = lazy(() => import("@/pages/Logout"));
const News = lazy(() => import("@/pages/News"));
const Article = lazy(() => import("@/pages/Article"));
const AddNews = lazy(() => import("@/pages/AddNews"));
const EditNews = lazy(() => import("@/pages/EditNews"));
const AddPodcast = lazy(() => import("@/pages/AddPodcast"));
const EditPodcast = lazy(() => import("@/pages/EditPodcast"));
const Forums = lazy(() => import("@/pages/Forums"));
const DiscussionDetail = lazy(() => import("@/pages/DiscussionDetail"));
const Resources = lazy(() => import("@/pages/Resources"));
const Podcasts = lazy(() => import("@/pages/Podcasts"));
const PodcastEpisode = lazy(() => import("@/pages/PodcastEpisode"));
const Community = lazy(() => import("@/pages/Community"));
const About = lazy(() => import("@/pages/About"));
const Admin = lazy(() => import("@/pages/Admin"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const MenuSettings = lazy(() => import("@/pages/MenuSettings"));
const CategoryManagement = lazy(() => import("@/pages/CategoryManagement"));
const MainPageControl = lazy(() => import("@/pages/MainPageControl"));
const Settings = lazy(() => import("@/pages/Settings"));
const Toolbox = lazy(() => import("@/pages/Toolbox"));
const Welcome = lazy(() => import("@/pages/Welcome"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen bg-white dark:bg-dark-bg"
          role="status"
          aria-label="Loading page"
        />
      }
    >
      <Switch>
      {/* Authenticated routes that need to be checked first */}
      {!isLoading && isAuthenticated && (
        <>
          <Route path="/news/add" component={AddNews} />
          <Route path="/news/:id/edit" component={EditNews} />
          <Route path="/podcasts/add" component={AddPodcast} />
          <Route path="/podcasts/:id/edit" component={EditPodcast} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/users" component={UserManagement} />
          <Route path="/admin/menu" component={MenuSettings} />
          <Route path="/admin/categories" component={CategoryManagement} />
          <Route path="/admin/main-page" component={MainPageControl} />
        </>
      )}
      
      {/* Settings page - handles auth internally, redirects to login if not authenticated */}
      <Route path="/settings" component={Settings} />
      
      {/* Public routes - accessible to everyone */}
      <Route path="/news" component={News} />
      <Route path="/forums" component={Forums} />
      <Route path="/forums/:id" component={DiscussionDetail} />
      <Route path="/resources" component={Resources} />
      <Route path="/podcasts" component={Podcasts} />
      <Route path="/toolbox" component={Toolbox} />
      <Route path="/community" component={Community} />
      <Route path="/about" component={About} />
      <Route path="/login" component={Login} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/logout" component={Logout} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/unsubscribe" component={Unsubscribe} />
      
      {/* Article detail route must come AFTER /news/add to avoid matching "add" as an id */}
      <Route path="/news/:id" component={Article} />
      {/* Podcast detail route must come AFTER podcast add/edit routes */}
      <Route path="/podcasts/:id" component={PodcastEpisode} />
      
      {/* Home/Landing route - same for everyone */}
      <Route path="/" component={Landing} />
      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <RouteSeoMetadata />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
