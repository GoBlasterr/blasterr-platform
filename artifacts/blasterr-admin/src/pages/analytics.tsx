import { useGetAdminAnalytics } from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, MessageSquare, AlertTriangle, ShieldCheck } from "lucide-react";
import { 
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useGetAdminAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform activity and moderation performance.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Card className="h-[400px]"><CardContent className="h-full flex items-center justify-center"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform activity and moderation performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Users" value={data.activeUsers.toLocaleString()} icon={Activity} />
        <StatCard title="Total Blasts" value={data.totalBlasts.toLocaleString()} icon={MessageSquare} />
        <StatCard title="Open Reports" value={data.openReports.toLocaleString()} icon={AlertTriangle} className="text-destructive" />
        <StatCard title="Moderation Rate" value={`${data.moderationRate}%`} icon={ShieldCheck} />
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-wider text-sm text-muted-foreground">Platform Activity Trend</CardTitle>
          <CardDescription className="text-xl font-bold text-foreground mt-1">
            Users, Blasts & Reports Over Time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono)' }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '2px',
                    boxShadow: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="users" name="Users" fill="hsl(var(--foreground))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="blasts" name="Blasts" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                <Bar dataKey="reports" name="Reports" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, className = "" }: { title: string, value: string | number, icon: any, className?: string }) {
  return (
    <Card className="rounded-sm border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className={`w-4 h-4 text-muted-foreground ${className}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-mono tracking-tight ${className}`} data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}