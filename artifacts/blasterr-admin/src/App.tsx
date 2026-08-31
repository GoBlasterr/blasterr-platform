import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { getGetAdminOverviewQueryKey, useGetAdminOverview } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import AdvertisingBillingPage from '@/pages/advertising/billing';
import AdvertisingTransactionsPage from '@/pages/advertising/transactions';
import AdvertisingRevenuePage from '@/pages/advertising/revenue';
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
import AdGroupsPage from '@/pages/advertising/ad-groups';
import CreativesPage from '@/pages/advertising/creatives';
import TargetingPage from '@/pages/advertising/targeting';
import BudgetsPage from '@/pages/advertising/budgets';
import PromotionsPage from '@/pages/advertising/promotions';
import AdvertisingFraudPage from '@/pages/advertising/fraud';
import AdvertisingReportsPage from '@/pages/advertising/ad-reports';
import AdvertisingNotificationsPage from '@/pages/advertising/notifications';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function AdminRouter() {
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
          <Route path="/advertising/ad-groups" component={AdGroupsPage} />
          <Route path="/advertising/advertisements" component={AdvertisementsPage} />
          <Route path="/advertising/creatives" component={CreativesPage} />
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
          <Route path="/advertising/sponsored" component={() => <PromotionsPage defaultType="sponsored_content" />} />
          <Route path="/advertising/trends" component={() => <PromotionsPage defaultType="sponsored_trend" />} />
          <Route path="/advertising/hashtags" component={() => <PromotionsPage defaultType="sponsored_hashtag" />} />
          <Route path="/advertising/promotions" component={() => <PromotionsPage defaultType="featured_promotion" />} />
          <Route path="/advertising/targeting" component={TargetingPage} />
          <Route path="/advertising/budgets" component={BudgetsPage} />

          <Route path="/advertising/billing" component={AdvertisingBillingPage} />
          <Route path="/advertising/transactions" component={AdvertisingTransactionsPage} />
          <Route path="/advertising/revenue" component={AdvertisingRevenuePage} />
          
          <Route path="/advertising/analytics" component={() => <IntegrationRequired moduleName="Advertising Analytics" />} />
          <Route path="/advertising/reports" component={AdvertisingReportsPage} />
          <Route path="/advertising/fraud" component={AdvertisingFraudPage} />
          <Route path="/advertising/notifications" component={AdvertisingNotificationsPage} />

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

function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('info@blasterr.co');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !email.trim() || !password || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const firstFactor = await signIn.create({ identifier: email.trim() });
      if (firstFactor.status !== 'needs_first_factor') {
        throw new Error('This account is not configured for password sign-in.');
      }
      const result = await signIn.attemptFirstFactor({
        strategy: 'password',
        password,
      });
      if (result.status !== 'complete' || !result.createdSessionId) {
        throw new Error('Additional verification is required. Contact a BLASTERR administrator.');
      }
      await setActive({ session: result.createdSessionId });
    } catch (cause: any) {
      setError(cause?.errors?.[0]?.longMessage || cause?.message || 'Unable to sign in with those credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-black px-4 py-12 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-10">
        <img
          src={`${import.meta.env.BASE_URL}blasterr-logo.png`}
          alt="BLASTERR"
          className="h-auto w-[min(20rem,62vw)] object-contain"
          data-testid="img-sign-in-blasterr-logo"
        />
        <section className="w-full rounded-sm border border-white/20 bg-black p-8 text-white shadow-2xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#e5f403]">
            Restricted control center
          </p>
          <form className="mt-8 space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="staff-email">Email address</label>
              <Input
                id="staff-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email address"
                className="border-white/30 bg-black text-white placeholder:text-white/60 focus-visible:ring-[#e5f403]"
                required
                data-testid="staff-email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="staff-password">Password</label>
              <div className="relative">
                <Input
                  id="staff-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="border-white/30 bg-black pr-16 text-white placeholder:text-white/60 focus-visible:ring-[#e5f403]"
                  required
                  data-testid="staff-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 text-xs font-semibold text-[#e5f403] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#e5f403] focus:ring-offset-2 focus:ring-offset-black"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={!isLoaded || isSubmitting || !email.trim() || !password}
              className="inline-flex h-10 w-full items-center justify-center rounded-sm bg-[#e5f403] px-5 text-sm font-semibold text-black transition-colors hover:bg-[#e5f403]/90 disabled:cursor-not-allowed"
              data-testid="staff-sign-in"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function SignedOutRouter() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/sign-in" />} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={() => <Redirect to="/sign-in" />} />
      <Route component={() => <Redirect to="/sign-in" />} />
    </Switch>
  );
}

function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function AuthLoadingState() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
        Verifying staff access…
      </p>
    </main>
  );
}

function AccessDeniedState() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const identity = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? 'this account';

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-xl rounded-sm border border-destructive/30 bg-card p-8 shadow-2xl">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-destructive">
          Access denied · 403
        </p>
        <h1 className="font-mono text-3xl font-bold tracking-tight">Staff authorization required</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {identity} is signed in, but this account is not authorized for the BLASTERR
          control center. Ask a BLASTERR administrator to grant staff access.
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          The server verifies the staff role for every admin request. This screen is
          only a clear client-side explanation of that server decision.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-7 rounded-sm font-mono text-xs uppercase tracking-wider"
          onClick={() => void signOut({ redirectUrl: basePath || '/' })}
          data-testid="button-sign-out-denied"
        >
          Sign out
        </Button>
      </section>
    </main>
  );
}

function SessionVerificationState() {
  const { signOut } = useClerk();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-xl rounded-sm border border-destructive/30 bg-card p-8 shadow-2xl">
        <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.22em] text-destructive">
          Session verification failed · 401
        </p>
        <h1 className="font-mono text-3xl font-bold tracking-tight">Sign-in required</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Clerk shows an active session, but the BLASTERR API could not verify it.
          Sign out and sign in again to refresh your session.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-7 rounded-sm font-mono text-xs uppercase tracking-wider"
          onClick={() => void signOut({ redirectUrl: `${basePath}/sign-in` })}
          data-testid="button-refresh-session"
        >
          Sign in again
        </Button>
      </section>
    </main>
  );
}

function AdminAccessGate() {
  const { data, isPending, isError, error } = useGetAdminOverview({
    query: {
      queryKey: getGetAdminOverviewQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
    request: {
      credentials: 'include',
    },
  });

  if (isPending || (!data && !isError)) return <AuthLoadingState />;
  if (isError) {
    return httpStatus(error) === 403 ? <AccessDeniedState /> : <SessionVerificationState />;
  }

  return <AdminRouter />;
}

function AuthenticatedRouter() {
  return <AdminAccessGate />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const { isSignedIn } = useAuth();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          {isSignedIn ? <AuthenticatedRouter /> : <SignedOutRouter />}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
