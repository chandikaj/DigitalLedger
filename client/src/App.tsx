import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import Home from "@/pages/Home";
import News from "@/pages/News";
import Article from "@/pages/Article";
import AddNews from "@/pages/AddNews";
import EditNews from "@/pages/EditNews";
import AddPodcast from "@/pages/AddPodcast";
import EditPodcast from "@/pages/EditPodcast";
import Forums from "@/pages/Forums";
import DiscussionDetail from "@/pages/DiscussionDetail";
import Resources from "@/pages/Resources";
import Podcasts from "@/pages/Podcasts";
import Community from "@/pages/Community";
import About from "@/pages/About";
import Admin from "@/pages/Admin";
import UserManagement from "@/pages/UserManagement";
import MenuSettings from "@/pages/MenuSettings";
import CategoryManagement from "@/pages/CategoryManagement";
import MainPageControl from "@/pages/MainPageControl";
import Settings from "@/pages/Settings";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
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
          <Route path="/settings" component={Settings} />
        </>
      )}
      
      {/* Public routes - accessible to everyone */}
      <Route path="/news" component={News} />
      <Route path="/forums" component={Forums} />
      <Route path="/forums/:id" component={DiscussionDetail} />
      <Route path="/resources" component={Resources} />
      <Route path="/podcasts" component={Podcasts} />
      <Route path="/community" component={Community} />
      <Route path="/about" component={About} />
      <Route path="/login" component={Login} />
      <Route path="/logout" component={Logout} />
      
      {/* Article detail route must come AFTER /news/add to avoid matching "add" as an id */}
      <Route path="/news/:id" component={Article} />
      
      {/* Home/Landing route - same for everyone */}
      <Route path="/" component={Landing} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
