import { useEffect, useRef, type ReactNode } from 'react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkLoaded, ClerkLoading, ClerkProvider, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Layout
import { Shell } from '@/components/layout/shell';

// Pages
import Splash from '@/pages/splash';
import Home from '@/pages/home';
import CreateBlast from '@/pages/create';
import Trending from '@/pages/trending';
import Nearby from '@/pages/nearby';
import Search from '@/pages/search';
import TargetDetail from '@/pages/target-detail';
import Profile from '@/pages/profile';
import Notifications from '@/pages/notifications';
import Bookmarks from '@/pages/bookmarks';
import Settings from '@/pages/settings';
import Admin from '@/pages/admin';
import SignIn from '@/pages/sign-in';
import SignUp from '@/pages/sign-up';
import NotFound from '@/pages/not-found';
import ClipsLibrary from '@/pages/clips/index';
import CreateClip from '@/pages/clips/create';
import { Disclaimer, PrivacyPolicy, TermsAndConditions } from '@/pages/legal';
import CmsCollectionPage from '@/pages/cms-collection';
import BusinessList from '@/pages/business/index';
import BusinessDetail from '@/pages/business/detail';
import BusinessClaim from '@/pages/business/claim';
import BusinessCenter from '@/pages/business/center';
import CreateBusinessProfile from '@/pages/business/create';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Splash} />
          <Route path="/splash" component={Splash} />
          <Route path="/home" component={Home} />
          <Route path="/following" component={Home} />
          <Route path="/create">
            <SignedInOnly>
              <CreateBlast />
            </SignedInOnly>
          </Route>
          <Route path="/trending" component={Trending} />
          <Route path="/trending/targets" component={Trending} />
          <Route path="/business" component={BusinessList} />
          <Route path="/business/create">
            <SignedInOnly>
              <CreateBusinessProfile />
            </SignedInOnly>
          </Route>
          <Route path="/business/:slug" component={BusinessDetail} />
          <Route path="/business/:slug/claim">
            <SignedInOnly>
              <BusinessClaim />
            </SignedInOnly>
          </Route>
          <Route path="/business/:targetId/center">
            <SignedInOnly>
              <BusinessCenter />
            </SignedInOnly>
          </Route>
          <Route path="/nearby" component={Nearby} />
          <Route path="/search" component={Search} />
          <Route path="/target/:slug" component={TargetDetail} />
          <Route path="/profile/:username" component={Profile} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/bookmarks" component={Bookmarks} />
          <Route path="/clips" component={ClipsLibrary} />
          <Route path="/clips/create/:blastId" component={CreateClip} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={Admin} />
          <Route path="/sign-in/*?" component={SignIn} />
          <Route path="/sign-up/*?" component={SignUp} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsAndConditions} />
          <Route path="/disclaimer" component={Disclaimer} />
          <Route path="/site/:type" component={CmsCollectionPage} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function SignedInOnly({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const activeQueryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      activeQueryClient.clear();
    }
    previousUserId.current = userId;
  }), [activeQueryClient, addListener]);

  return null;
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const currentPath = stripBase(location);
  const isSplashRoute = currentPath === "/" || currentPath === "/splash";
  const isAuthRoute = currentPath.startsWith("/sign-in") || currentPath.startsWith("/sign-up");

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      appearance={{
        theme: dark,
        options: {
          logoPlacement: 'inside',
          logoLinkUrl: basePath || '/',
          logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
        },
        variables: {
          colorPrimary: '#e5f403',
          colorForeground: '#f7f8f2',
          colorMutedForeground: '#9da38f',
          colorBackground: '#11130f',
          colorInput: '#090a08',
          colorInputForeground: '#f7f8f2',
          colorDanger: '#ff4d67',
          colorNeutral: '#454b39',
          fontFamily: 'DM Sans, sans-serif',
          borderRadius: '16px',
        },
      }}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in and rejoin the conversation.' } },
        signUp: { start: { title: 'Join BLASTERR', subtitle: 'Create your account and start blasting.' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <Link
          href="/"
          className={`fixed left-1/2 top-12 z-[30] -translate-x-1/2 transition-opacity md:top-14 ${
            isAuthRoute
              ? 'pointer-events-auto opacity-100 hover:opacity-80'
              : 'pointer-events-none opacity-0'
          }`}
          aria-label={isAuthRoute ? 'Go to BLASTERR home' : undefined}
          aria-hidden={!isAuthRoute}
          tabIndex={isAuthRoute ? 0 : -1}
        >
          <img
            src={`${basePath}/logo.png`}
            alt={isAuthRoute ? 'BLASTERR' : ''}
            className="h-20 w-auto object-contain md:h-24"
            fetchPriority="high"
            decoding="sync"
          />
        </Link>
        {isSplashRoute ? (
          <ThemeProvider>
            <Splash />
          </ThemeProvider>
        ) : (
          <>
            <ClerkLoading>
              <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <span className="text-sm font-medium">Loading BLASTERR…</span>
              </div>
            </ClerkLoading>
            <ClerkLoaded>
              <ThemeProvider>
                <ClerkQueryClientCacheInvalidator />
                <TooltipProvider>
                  <div className="site-stars pointer-events-none fixed inset-0 z-[2]" aria-hidden="true" />
                  <Router />
                  <Toaster />
                </TooltipProvider>
              </ThemeProvider>
            </ClerkLoaded>
          </>
        )}
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppContent />
    </WouterRouter>
  );
}

export default App;
