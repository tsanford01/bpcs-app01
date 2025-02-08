import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Appointments from "@/pages/appointments";
import Customers from "@/pages/customers";
import Chat from "@/pages/chat";
import Routes from "@/pages/routes";
import Reviews from "@/pages/reviews";
import DashboardShell from "@/components/layout/dashboard-shell";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={() => (
        <DashboardShell>
          <Dashboard />
        </DashboardShell>
      )} />
      <ProtectedRoute path="/appointments" component={() => (
        <DashboardShell>
          <Appointments />
        </DashboardShell>
      )} />
      <ProtectedRoute path="/customers" component={() => (
        <DashboardShell>
          <Customers />
        </DashboardShell>
      )} />
      <ProtectedRoute path="/chat" component={() => (
        <DashboardShell>
          <Chat />
        </DashboardShell>
      )} />
      <ProtectedRoute path="/routes" component={() => (
        <DashboardShell>
          <Routes />
        </DashboardShell>
      )} />
      <ProtectedRoute path="/reviews" component={() => (
        <DashboardShell>
          <Reviews />
        </DashboardShell>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
