// main app setup

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/layout";
import AuthPage from "@/pages/auth";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import ResourcesPage from "@/pages/resources";
import ForumsPage from "@/pages/forums";
import ForumPostPage from "@/pages/forum-post";
import StudyGroupsPage from "@/pages/study-groups";
import MessagesPage from "@/pages/messages";
import ProfilePage from "@/pages/profile";
import CalendarPage from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/courses" component={CoursesPage} />
      <Route path="/resources" component={ResourcesPage} />
      <Route path="/forums" component={ForumsPage} />
      <Route path="/forum/post/:postId">
        {(params) => <ForumPostPage postId={params.postId} />}
      </Route>
      <Route path="/study-groups" component={StudyGroupsPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Layout>
            <Toaster />
            <Router />
          </Layout>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
