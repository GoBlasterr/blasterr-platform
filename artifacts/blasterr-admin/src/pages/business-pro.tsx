import { useGetAdminBusinessProSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, DollarSign, Users } from "lucide-react";

export default function BusinessProPage() {
  const summary = useGetAdminBusinessProSummary();
  if (summary.isLoading) {
    return <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}</div>;
  }
  if (summary.isError || !summary.data) return <AdminErrorState title="Business Pro data unavailable" message="The subscription summary could not be loaded." />;
  const data = summary.data;
  const cards = [
    { label: "Active subscriptions", value: data.active, icon: Users },
    { label: "Trialing", value: data.trialing, icon: CreditCard },
    { label: "Estimated MRR", value: `$${(data.monthlyRecurringRevenueCents / 100).toFixed(2)}`, icon: DollarSign },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-primary">Revenue / Business</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Business Pro</h1>
        <p className="mt-1 text-muted-foreground">Owner-only Business Target subscriptions. Advertising spend remains separate.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Subscription health</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant="outline">Past due: {data.pastDue}</Badge>
          <Badge variant="outline">Canceled / expired: {data.canceled}</Badge>
          <Badge variant="outline">$49 USD monthly</Badge>
        </CardContent>
      </Card>
    </div>
  );
}