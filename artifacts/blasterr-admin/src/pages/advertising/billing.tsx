import { getGetAdminAdvertisingBillingQueryKey, useGetAdminAdvertisingBilling } from "@workspace/api-client-react";
import { IntegrationRequired } from "@/components/layout/integration-required";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ReceiptText, RotateCcw } from "lucide-react";

const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);

export default function AdvertisingBillingPage() {
  const { data, isLoading, isError } = useGetAdminAdvertisingBilling({
    query: { queryKey: getGetAdminAdvertisingBillingQueryKey(), retry: false, staleTime: 30_000 },
  });

  if (isError) return <IntegrationRequired moduleName="Billing & Payments" />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Payments</h1>
          <p className="text-muted-foreground">Provider-backed campaign charges and balances only.</p>
        </div>
        {data?.provider && <Badge variant="outline" className="uppercase">{data.provider} connected</Badge>}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Payment methods are tokenized and stored by the connected provider. BLASTERR never receives or stores raw card numbers or CVV data.
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32" />)}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.balances.flatMap((balance) => [
            { key: `${balance.currency}-gross`, label: `Gross charges (${balance.currency.toUpperCase()})`, value: money(balance.grossAmountMinor, balance.currency), icon: DollarSign },
            { key: `${balance.currency}-refunded`, label: `Refunded (${balance.currency.toUpperCase()})`, value: money(balance.refundedAmountMinor, balance.currency), icon: RotateCcw },
            { key: `${balance.currency}-net`, label: `Net collected (${balance.currency.toUpperCase()})`, value: money(balance.netAmountMinor, balance.currency), icon: DollarSign },
          ]).concat([{ key: "transactions", label: "Transactions", value: data.transactionCount.toLocaleString(), icon: ReceiptText }]).map(({ key, label, value, icon: Icon }) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
            </Card>
          ))}
          {data.balances.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No settled provider-backed balances yet.</p>}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Financial source of truth</CardTitle>
          <CardDescription>Amounts appear here only after a verified provider webhook has been accepted and persisted.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}