import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import { getGetAnnouncementsQueryKey, useGetAnnouncements } from "@workspace/api-client-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const DISMISSED_ANNOUNCEMENTS_KEY = "blasterr.dismissed-announcements";

function readDismissedAnnouncementIds(): Set<string> {
  try {
    const stored = window.localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    const ids = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function AnnouncementsSurface() {
  const { data: announcements, isError } = useGetAnnouncements({
    query: {
      queryKey: getGetAnnouncementsQueryKey(),
      refetchInterval: 30_000,
      staleTime: 15_000,
    },
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissedAnnouncementIds);

  if (isError || !announcements?.length) return null;

  const visibleAnnouncements = announcements.filter(({ id }) => !dismissedIds.has(id));
  if (!visibleAnnouncements.length) return null;

  const dismiss = (id: string) => {
    setDismissedIds((current) => {
      const next = new Set(current);
      next.add(id);
      try {
        window.localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify([...next]));
      } catch {
        // Dismissal still applies for this session when storage is unavailable.
      }
      return next;
    });
  };

  return (
    <section
      aria-label="Platform announcements"
      aria-live="polite"
      className="space-y-3 border-b border-white/5 p-4 md:p-5"
      data-testid="section-platform-announcements"
    >
      {visibleAnnouncements.map((announcement) => (
        <Alert
          key={announcement.id}
          className="border-primary/30 bg-primary/[0.08] pr-12 text-white shadow-[0_0_24px_rgba(229,244,3,0.08)]"
          data-testid={`announcement-${announcement.id}`}
        >
          <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
          <AlertTitle className="font-display text-base text-primary" data-testid={`announcement-title-${announcement.id}`}>
            {announcement.title}
          </AlertTitle>
          <AlertDescription className="text-sm leading-relaxed text-white/80" data-testid={`announcement-message-${announcement.id}`}>
            {announcement.message}
          </AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Dismiss announcement: ${announcement.title}`}
            className="absolute right-2 top-2 text-muted-foreground hover:bg-white/10 hover:text-white"
            data-testid={`button-dismiss-announcement-${announcement.id}`}
            onClick={() => dismiss(announcement.id)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Alert>
      ))}
    </section>
  );
}