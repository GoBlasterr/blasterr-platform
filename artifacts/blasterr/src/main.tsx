import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

type ViewerLocale = { language: string; direction: 'ltr' | 'rtl' };

async function applyViewerLocale() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch('/api/localization/locale', {
      credentials: 'include',
      signal: controller.signal,
    });
    if (!response.ok) return;
    const locale = await response.json() as ViewerLocale;
    document.documentElement.lang = locale.language;
    document.documentElement.dir = locale.direction;
  } catch {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  } finally {
    window.clearTimeout(timeout);
  }
}

void applyViewerLocale().finally(() => {
  createRoot(document.getElementById('root')!, {
    // Keeps caught errors off reportError(), which would raise the dev overlay.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
});
