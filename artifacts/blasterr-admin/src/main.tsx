import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkLoaded, ClerkLoading, ClerkProvider, Show, SignInButton, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

function AdminAuthTransport() {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  return null;
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
  >
    <ClerkLoading>
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading BLASTERR ADMIN…</div>
    </ClerkLoading>
    <ClerkLoaded>
      <Show when="signed-in">
        <AdminAuthTransport />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </Show>
      <Show when="signed-out">
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <section className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Restricted control center</p>
            <h1 className="text-3xl font-bold">BLASTERR ADMIN</h1>
            <p className="mt-3 text-sm text-muted-foreground">Sign in with an authorized staff account to manage advertising and moderation.</p>
            <SignInButton mode="modal">
              <button className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">Staff sign in</button>
            </SignInButton>
          </section>
        </main>
      </Show>
    </ClerkLoaded>
  </ClerkProvider>,
);
