import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkLoaded, ClerkLoading, ClerkProvider, Show, useAuth } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { Input } from '@/components/ui/input';

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

function StaffSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !username.trim() || !password || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const firstFactor = await signIn.create({ identifier: username.trim() });
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
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <section className="w-full max-w-md rounded-xl border border-white/20 bg-black p-8 text-white shadow-2xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#e5f403]">Restricted control center</p>
        <h1 className="text-center text-3xl font-bold text-white">BLASTERR ADMIN</h1>
        <p className="mt-3 text-center text-sm text-white">Sign in with your authorized staff credentials.</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="staff-username">Username</label>
            <Input
              id="staff-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              className="border-white/30 bg-black text-white placeholder:text-white/60 focus-visible:ring-[#e5f403]"
              required
              data-testid="staff-username"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="staff-password">Password</label>
            <Input
              id="staff-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="border-white/30 bg-black text-white placeholder:text-white/60 focus-visible:ring-[#e5f403]"
              required
              data-testid="staff-password"
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={!isLoaded || isSubmitting || !username.trim() || !password}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#e5f403] px-5 text-sm font-semibold text-black hover:bg-[#e5f403]/90 disabled:cursor-not-allowed"
            data-testid="staff-sign-in"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading BLASTERR ADMIN…</div>
    </ClerkLoading>
    <ClerkLoaded>
      <Show when="signed-in">
        <AdminAuthTransport />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </Show>
      <Show when="signed-out">
        <StaffSignIn />
      </Show>
    </ClerkLoaded>
  </ClerkProvider>,
);
