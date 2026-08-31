import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminAdvertisingNotificationsQueryKey,
  useListAdminAdvertisingNotifications,
  useMarkAdminAdvertisingNotificationRead,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Check } from "lucide-react";

export default function AdvertisingNotificationsPage() {
  const queryClient = useQueryClient();
  const query = useListAdminAdvertisingNotifications({ limit: 100 });
  const markRead = useMarkAdminAdvertisingNotificationRead();
  if (query.isError) return <AdminErrorState error={query.error} />;
  return <div className="space-y-6">
    <div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Operations inbox</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Ad Integrity Alerts</h1><p className="mt-1 text-sm text-muted-foreground">High-severity anomalies are persisted here until reviewed.</p></div>
    {query.isLoading ? <Skeleton className="h-48 w-full" /> : !query.data?.items.length ? <Card className="rounded-sm"><CardContent className="flex h-40 flex-col items-center justify-center text-muted-foreground"><BellRing className="mb-3 h-7 w-7" />No integrity alerts.</CardContent></Card> :
      <div className="space-y-3">{query.data.items.map((item) => <Card key={item.id} className={`rounded-sm ${item.read ? "opacity-70" : "border-primary/50"}`}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Badge variant={item.severity === "critical" ? "destructive" : "outline"}>{item.severity.toUpperCase()}</Badge><h2 className="font-semibold">{item.title}</h2></div><p className="mt-2 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p></div>{!item.read && <Button size="sm" variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate({ id: item.id }, { onSuccess: () => void queryClient.invalidateQueries({ queryKey: getListAdminAdvertisingNotificationsQueryKey() }) })}><Check className="mr-2 h-4 w-4" />Mark read</Button>}</CardContent></Card>)}</div>}
  </div>;
}