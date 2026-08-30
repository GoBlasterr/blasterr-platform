import { useEffect, useRef, type ReactNode } from 'react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { dark } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

// Layout
import { Shell } from '@/components/layout/shell';

// Pages
import Landing from '@/pages/landing';
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
          <Route path="/" component={Landing} />
          <Route path="/splash" component={Splash} />
          <Route path="/home" component={Home} />
          <Route path="/create" component={CreateBlast} />
          <Route path="/trending" component={Trending} />
          <Route path="/nearby" component={Nearby} />
          <Route path="/search" component={Search} />
          <Route path="/target/:slug" component={TargetDetail} />
          <Route path="/profile/:username" component={Profile} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/bookmarks" component={Bookmarks} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={Admin} />
          <Route path="/sign-in/*?" component={SignIn} />
          <Route path="/sign-up/*?" component={SignUp} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
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
  const [, setLocation] = useLocation();

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
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
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
