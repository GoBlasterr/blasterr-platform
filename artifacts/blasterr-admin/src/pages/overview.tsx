import { useGetAdminOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, MessageSquare, TrendingUp, UserPlus, Flame } from "lucide-react";
import { 
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function OverviewPage() {
  const { data: overview, isLoading, isError } = useGetAdminOverview();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Platform telemetry and vitals.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-sm h-[400px]">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-xl font-bold">Failed to load telemetry</h2>
        <p className="text-muted-foreground mt-2">Ensure backend is reachable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform telemetry and vitals.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-muted text-muted-foreground px-3 py-1.5 rounded-sm font-bold tracking-wide">
          {import.meta.env.DEV ? 'DEVELOPMENT DATA' : 'API CONNECTED'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Users Online" 
          value={overview.usersOnline.toLocaleString()} 
          icon={Users} 
        />
        <StatCard 
          title="Blasts Today" 
          value={overview.blastsToday.toLocaleString()} 
          icon={MessageSquare} 
        />
        <StatCard 
          title="Trending Topics" 
          value={overview.trendingCount.toLocaleString()} 
          icon={Flame} 
        />
        <StatCard 
          title="New Registrations" 
          value={overview.newUsers.toLocaleString()} 
          icon={UserPlus} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 rounded-sm border-border shadow-none">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-wider text-sm text-muted-foreground">Activity Volume</CardTitle>
            <CardDescription className="text-xl font-bold text-foreground mt-1">
              Users vs Blasts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlasts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '2px',
                      boxShadow: 'none',
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="blasts" 
                    stroke="hsl(var(--foreground))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorBlasts)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border shadow-none bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-wider text-sm opacity-80">Platform Engagement</CardTitle>
            <CardDescription className="text-primary-foreground/70 mt-1">
              Platform engagement metric
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[300px]">
            <div className="text-center">
              <div className="text-6xl font-extrabold font-mono tracking-tighter mb-4">
                {overview.engagement}%
              </div>
              <div className="flex items-center justify-center gap-2 text-sm bg-black/20 w-fit mx-auto px-4 py-2 rounded-sm font-mono font-bold">
                <span>API SNAPSHOT</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon
}: { 
  title: string, 
  value: string | number, 
  icon: any
}) {
  return (
    <Card className="rounded-sm border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
