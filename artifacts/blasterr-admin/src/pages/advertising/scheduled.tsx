import { useState } from "react";
import {
  getListAdminCampaignsQueryKey,
  useListAdminCampaigns,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ScheduledAdsPage() {
  const [page, setPage] = useState(1);
  const queryParams = { page, limit: 100 };
  const query = useListAdminCampaigns(queryParams, {
    query: { queryKey: getListAdminCampaignsQueryKey(queryParams) },
  });

  if (query.isError) return <AdminErrorState error={query.error} />;

  const now = Date.now();
  const scheduled = (query.data?.items ?? []).filter((campaign) => {
    if (!campaign.startsAt || campaign.status === "paused") return false;
    const startsAt = new Date(campaign.startsAt).getTime();
    return Number.isFinite(startsAt) && startsAt > now;
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Ads</h1>
        <p className="text-muted-foreground">
          Campaigns configured to begin delivering at a future date.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-6"><Skeleton className="h-56 w-full" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Placements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!scheduled.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No future campaign schedules.
                    </TableCell>
                  </TableRow>
                ) : scheduled.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {campaign.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">{campaign.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(campaign.startsAt!).toLocaleString()}</TableCell>
                    <TableCell>
                      {campaign.endsAt ? new Date(campaign.endsAt).toLocaleString() : "No end date"}
                    </TableCell>
                    <TableCell className="max-w-sm">
                      {campaign.placements.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {query.data && query.data.total > query.data.limit && (
            <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
              <span>{query.data.total} campaigns</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!query.data.hasMore}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
