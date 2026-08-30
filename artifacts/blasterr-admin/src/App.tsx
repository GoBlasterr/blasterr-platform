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

import AdvertisingOverviewPage from '@/pages/advertising/overview';
import AdvertisersPage from '@/pages/advertising/advertisers';
import CampaignsPage from '@/pages/advertising/campaigns';
import AdvertisementsPage from '@/pages/advertising/advertisements';
import ApprovalsPage from '@/pages/advertising/approvals';
import LiveAdsPage from '@/pages/advertising/live';
import ScheduledAdsPage from '@/pages/advertising/scheduled';
import PausedAdsPage from '@/pages/advertising/paused';
import RejectedAdsPage from '@/pages/advertising/rejected';
import AdvertisingSettingsPage from '@/pages/advertising/settings';
import AdvertisingAuditPage from '@/pages/advertising/audit';
import UsersPage from '@/pages/users';
import ContentPage from '@/pages/content';
import ReportsPage from '@/pages/reports';
import ModerationPage from '@/pages/moderation';
import AnalyticsPage from '@/pages/analytics';
import SettingsPage from '@/pages/settings';
import SystemPage from '@/pages/system';
import AuditLogPage from '@/pages/audit-log';
import AnnouncementsPage from '@/pages/announcements';
import FeatureControlsPage from '@/pages/feature-controls';

const queryClient = new QueryClient();

function Router() {
  return (
    <AdminShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={() => <Redirect to="/overview" />} />
          <Route path="/overview" component={OverviewPage} />
          <Route path="/media" component={MediaPage} />

          {/* Advertising Routes */}
          <Route path="/advertising" component={AdvertisingOverviewPage} />
          <Route path="/advertising/advertisers" component={AdvertisersPage} />
          <Route path="/advertising/campaigns" component={CampaignsPage} />
          <Route path="/advertising/ad-groups" component={() => <IntegrationRequired moduleName="Ad Groups" />} />
          <Route path="/advertising/advertisements" component={AdvertisementsPage} />
          <Route path="/advertising/creatives" component={() => <IntegrationRequired moduleName="Ad Creatives" />} />
          <Route path="/advertising/approvals" component={ApprovalsPage} />

          {/* Advertising Sub-views */}
          <Route path="/advertising/live" component={LiveAdsPage} />
          <Route path="/advertising/scheduled" component={ScheduledAdsPage} />
          <Route path="/advertising/paused" component={PausedAdsPage} />
          <Route path="/advertising/rejected" component={RejectedAdsPage} />

          <Route path="/advertising/settings" component={AdvertisingSettingsPage} />
          <Route path="/advertising/audit" component={AdvertisingAuditPage} />

          {/* Integration Required Advertising Routes */}
          <Route path="/advertising/boosted" component={() => <IntegrationRequired moduleName="Boosted Content" />} />
          <Route path="/advertising/sponsored" component={() => <IntegrationRequired moduleName="Sponsored Content" />} />
          <Route path="/advertising/trends" component={() => <IntegrationRequired moduleName="Trends Targeting" />} />
          <Route path="/advertising/hashtags" component={() => <IntegrationRequired moduleName="Hashtags Targeting" />} />
          <Route path="/advertising/promotions" component={() => <IntegrationRequired moduleName="Promotions" />} />
          <Route path="/advertising/targeting" component={() => <IntegrationRequired moduleName="Audience Targeting" />} />
          <Route path="/advertising/budgets" component={() => <IntegrationRequired moduleName="Budget Controls" />} />

          <Route path="/advertising/billing" component={() => <IntegrationRequired moduleName="Billing & Payments" />} />
          <Route path="/advertising/transactions" component={() => <IntegrationRequired moduleName="Transactions" />} />
          <Route path="/advertising/revenue" component={() => <IntegrationRequired moduleName="Ad Revenue" />} />
          
          <Route path="/advertising/analytics" component={() => <IntegrationRequired moduleName="Advertising Analytics" />} />
          <Route path="/advertising/reports" component={() => <IntegrationRequired moduleName="Advertising Reports" />} />
          <Route path="/advertising/fraud" component={() => <IntegrationRequired moduleName="Click Fraud Detection" />} />

          {/* Core App Routes */}
          <Route path="/users" component={UsersPage} />
          <Route path="/content" component={ContentPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/moderation" component={ModerationPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/system" component={SystemPage} />
          <Route path="/audit-log" component={AuditLogPage} />
          <Route path="/admins" component={() => <IntegrationRequired moduleName="Admins" />} />
          <Route path="/revenue" component={() => <IntegrationRequired moduleName="Revenue" />} />
          <Route path="/announcements" component={AnnouncementsPage} />
          <Route path="/feature-controls" component={FeatureControlsPage} />
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
