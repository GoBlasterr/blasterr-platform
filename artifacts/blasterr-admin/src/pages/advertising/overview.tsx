import { useGetAdminAdvertisingOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, TrendingUp, Users, Target, Activity } from "lucide-react";
import { Link } from "wouter";

export default function AdvertisingOverviewPage() {
  const { data: overview, isLoading } = useGetAdminAdvertisingOverview();

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Advertising Command Center</h1>
        <p className="text-muted-foreground">Monitor and manage network-wide advertising operations.</p>
      </div>

      {!overview?.billingIntegrationAvailable && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Billing Integration Offline</h4>
            <p className="text-sm mt-1">Payment processing is currently unavailable. No financial transactions will be processed. Active ads will continue delivery but billing counters are paused.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Advertisers</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.advertiserCount.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.campaignCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Running Ads</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.activeAdvertisementCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Ad Events (24h)</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.eventCount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Navigate to core advertising functions</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 flex-1">
            <Link href="/advertising/approvals" className="flex items-center gap-2 p-4 border rounded-md hover:bg-muted transition-colors">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <div className="font-medium text-sm">Review Pending Ads</div>
            </Link>
            <Link href="/advertising/advertisers" className="flex items-center gap-2 p-4 border rounded-md hover:bg-muted transition-colors">
              <Users className="w-5 h-5 text-primary" />
              <div className="font-medium text-sm">Manage Advertisers</div>
            </Link>
            <Link href="/advertising/campaigns" className="flex items-center gap-2 p-4 border rounded-md hover:bg-muted transition-colors">
              <Target className="w-5 h-5 text-primary" />
              <div className="font-medium text-sm">View Campaigns</div>
            </Link>
            <Link href="/advertising/settings" className="flex items-center gap-2 p-4 border rounded-md hover:bg-muted transition-colors">
              <Activity className="w-5 h-5 text-primary" />
              <div className="font-medium text-sm">Platform Settings</div>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes to advertising configuration</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 max-h-[300px] overflow-y-auto pr-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : overview?.activity && overview.activity.length > 0 ? (
              <div className="space-y-4">
                {overview.activity.map(audit => (
                  <div key={audit.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-semibold">{audit.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(audit.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {audit.entityType} {audit.entityId && `(${audit.entityId.slice(0, 8)}...)`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
