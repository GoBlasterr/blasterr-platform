import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import OverviewPage from '@/pages/overview';
import MediaPage from '@/pages/media';
import { AdminShell } from '@/components/layout/admin-shell';
import { IntegrationRequired } from '@/components/layout/integration-required';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
  Redirect
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <AdminShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={() => <Redirect to="/overview" />} />
          <Route path="/overview" component={OverviewPage} />
          <Route path="/media" component={MediaPage} />
          
          <Route path="/users" component={() => <IntegrationRequired moduleName="Users" />} />
          <Route path="/content" component={() => <IntegrationRequired moduleName="Content" />} />
          <Route path="/reports" component={() => <IntegrationRequired moduleName="Reports" />} />
          <Route path="/moderation" component={() => <IntegrationRequired moduleName="Moderation" />} />
          <Route path="/analytics" component={() => <IntegrationRequired moduleName="Analytics" />} />
          <Route path="/settings" component={() => <IntegrationRequired moduleName="Settings" />} />
          <Route path="/system" component={() => <IntegrationRequired moduleName="System" />} />
          <Route path="/audit-log" component={() => <IntegrationRequired moduleName="Audit Log" />} />
          <Route path="/admins" component={() => <IntegrationRequired moduleName="Admins" />} />
          <Route path="/revenue" component={() => <IntegrationRequired moduleName="Revenue" />} />
          <Route path="/announcements" component={() => <IntegrationRequired moduleName="Announcements" />} />
          <Route path="/feature-controls" component={() => <IntegrationRequired moduleName="Feature Controls" />} />
          <Route path="/blocked-words" component={() => <IntegrationRequired moduleName="Blocked Words" />} />
          <Route path="/appeals" component={() => <IntegrationRequired moduleName="Appeals" />} />
          <Route path="/trending" component={() => <IntegrationRequired moduleName="Trending" />} />
          <Route path="/notifications" component={() => <IntegrationRequired moduleName="Notifications" />} />
          
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AdminShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
