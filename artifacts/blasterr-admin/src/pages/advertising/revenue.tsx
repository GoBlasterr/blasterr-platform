import { getGetAdminAdvertisingRevenueQueryKey, useGetAdminAdvertisingRevenue } from "@workspace/api-client-react";
import { IntegrationRequired } from "@/components/layout/integration-required";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CircleDollarSign, Landmark, ReceiptText, RotateCcw } from "lucide-react";

const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);

export default function AdvertisingRevenuePage() {
  const { data, isLoading, isError } = useGetAdminAdvertisingRevenue({
    query: { queryKey: getGetAdminAdvertisingRevenueQueryKey(), retry: false, staleTime: 30_000 },
  });
  if (isError) return <IntegrationRequired moduleName="Ad Revenue" />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ad Revenue</h1>
          <p className="text-muted-foreground">Revenue recognized from settled provider transactions.</p>
        </div>
        {data?.provider && <Badge variant="outline" className="uppercase">{data.provider}</Badge>}
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32" />)}</div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.balances.flatMap((balance) => [
            { key: `${balance.currency}-gross`, label: `Gross revenue (${balance.currency.toUpperCase()})`, value: money(balance.grossAmountMinor, balance.currency), icon: CircleDollarSign },
            { key: `${balance.currency}-refunds`, label: `Refunds (${balance.currency.toUpperCase()})`, value: money(balance.refundedAmountMinor, balance.currency), icon: RotateCcw },
            { key: `${balance.currency}-net`, label: `Net revenue (${balance.currency.toUpperCase()})`, value: money(balance.netAmountMinor, balance.currency), icon: Landmark },
            { key: `${balance.currency}-count`, label: `Settled transactions (${balance.currency.toUpperCase()})`, value: balance.settledTransactionCount.toLocaleString(), icon: ReceiptText },
          ]).map(({ key, label, value, icon: Icon }) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
            </Card>
          ))}
          {data.balances.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No settled provider-backed revenue yet.</p>}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Recognition policy</CardTitle>
          <CardDescription>Pending and failed payments are excluded. Refunds reduce net revenue only after signed provider events update the ledger.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}