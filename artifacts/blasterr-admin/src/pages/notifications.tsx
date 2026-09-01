import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminNotificationsQueryKey,
  useListAdminNotifications,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BellRing, Check, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = { limit: 100, unreadOnly: false };
  const query = useListAdminNotifications(params, {
    query: {
      queryKey: getListAdminNotificationsQueryKey(params),
      refetchInterval: 30_000,
    },
  });
  const markRead = useMarkAdminNotificationRead();
  const markAll = useMarkAllAdminNotificationsRead();
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAdminNotificationsQueryKey(params) });

  if (query.isError) return <AdminErrorState error={query.error} />;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Operations inbox</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Platform Notifications</h1><p className="mt-1 text-sm text-muted-foreground">Moderation, advertising, account, content, and system events in one persistent queue.</p></div><Button variant="outline" disabled={!query.data?.unreadCount || markAll.isPending} onClick={() => markAll.mutate(undefined, { onSuccess: () => { void refresh(); toast({ title: "Notifications marked read" }); } })}><CheckCheck className="mr-2 h-4 w-4" />Mark all read ({query.data?.unreadCount ?? 0})</Button></div>
    {query.isLoading ? <Skeleton className="h-48 w-full" /> : !query.data?.items.length ? <Card className="rounded-sm"><CardContent className="flex h-40 flex-col items-center justify-center text-muted-foreground"><BellRing className="mb-3 h-7 w-7" />No platform notifications.</CardContent></Card> : <div className="space-y-3">{query.data.items.map((item) => <Card key={item.id} className={`rounded-sm ${item.read ? "opacity-70" : "border-primary/50"}`}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Badge variant="outline">{item.category.toUpperCase()}</Badge><h2 className="font-semibold">{item.title}</h2></div><p className="mt-2 text-sm text-muted-foreground">{item.message}</p>{item.entityType && <p className="mt-2 font-mono text-xs text-muted-foreground">{item.entityType}: {item.entityId}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div>{!item.read && <Button size="sm" variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate({ id: item.id }, { onSuccess: () => void refresh() })}><Check className="mr-2 h-4 w-4" />Mark read</Button>}</CardContent></Card>)}</div>}
  </div>;
}