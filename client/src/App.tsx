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
import Forums from "@/pages/Forums";
import DiscussionDetail from "@/pages/DiscussionDetail";
import Resources from "@/pages/Resources";
import Podcasts from "@/pages/Podcasts";
import Community from "@/pages/Community";
import Admin from "@/pages/Admin";
import UserManagement from "@/pages/UserManagement";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes - accessible to everyone */}
      <Route path="/news" component={News} />
      <Route path="/news/:id" component={Article} />
      <Route path="/forums" component={Forums} />
      <Route path="/forums/:id" component={DiscussionDetail} />
      <Route path="/resources" component={Resources} />
      <Route path="/podcasts" component={Podcasts} />
      <Route path="/community" component={Community} />
      <Route path="/login" component={Login} />
      <Route path="/logout" component={Logout} />
      
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/users" component={UserManagement} />
        </>
      )}
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
