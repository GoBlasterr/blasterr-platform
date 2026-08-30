import { createRoot } from 'react-dom/client';
import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: 'hsl(64 98% 42%)',
    colorForeground: 'hsl(0 0% 4%)',
    colorMutedForeground: 'hsl(0 0% 40%)',
    colorDanger: 'hsl(0 84% 60%)',
    colorBackground: 'hsl(0 0% 100%)',
    colorInput: 'hsl(0 0% 98%)',
    colorInputForeground: 'hsl(0 0% 4%)',
    colorNeutral: 'hsl(0 0% 90%)',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    borderRadius: '0.25rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-card rounded-sm w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-mono uppercase tracking-tight text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    footerActionLink: 'text-foreground underline underline-offset-4',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-foreground',
    formFieldSuccessText: 'text-emerald-600',
    alertText: 'text-destructive',
    logoBox: 'h-16',
    logoImage: 'h-12 w-auto',
    socialButtonsBlockButton: 'border-border bg-background hover:bg-muted',
    formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    formFieldInput: 'border-border bg-background text-foreground',
    footerAction: 'border-border',
    dividerLine: 'bg-border',
    alert: 'border-destructive/30 bg-destructive/10',
    otpCodeFieldInput: 'border-border bg-background text-foreground',
    formFieldRow: 'text-foreground',
    main: 'bg-transparent',
  },
};
createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: {
        start: {
          title: 'Staff sign in',
          subtitle: 'Use your authorized BLASTERR account',
        },
      },
      signUp: {
        start: {
          title: 'Request a staff account',
          subtitle: 'Only server-authorized staff can enter the control center',
        },
      },
    }}
  >
    <ClerkLoading>
      <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading BLASTERR ADMIN…</div>
    </ClerkLoading>
    <ClerkLoaded>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ClerkLoaded>
  </ClerkProvider>,
);
