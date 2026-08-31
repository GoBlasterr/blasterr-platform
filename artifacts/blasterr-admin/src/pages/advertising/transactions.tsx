import { useState } from "react";
import {
  getListAdminAdvertisingTransactionsQueryKey,
  useListAdminAdvertisingTransactions,
} from "@workspace/api-client-react";
import { IntegrationRequired } from "@/components/layout/integration-required";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const money = (amountMinor: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);

export default function AdvertisingTransactionsPage() {
  const [page, setPage] = useState(1);
  const params = { page, limit: 25 };
  const { data, isLoading, isError } = useListAdminAdvertisingTransactions(params, {
    query: { queryKey: getListAdminAdvertisingTransactionsQueryKey(params), retry: false, staleTime: 15_000 },
  });

  if (isError) return <IntegrationRequired moduleName="Transactions" />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">Verified provider events; no simulated charges or raw payment details.</p>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Provider reference</TableHead><TableHead>Type</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-28 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
            ) : !data?.items.length ? (
              <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No provider-backed transactions yet.</TableCell></TableRow>
            ) : data.items.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{new Date(transaction.providerCreatedAt ?? transaction.createdAt).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{transaction.providerTransactionId}</TableCell>
                <TableCell className="capitalize">{transaction.transactionType}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{transaction.status.replaceAll("_", " ")}</Badge></TableCell>
                <TableCell className="text-right font-medium">{money(transaction.amountMinor, transaction.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-sm text-muted-foreground">{data.total.toLocaleString()} transactions</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!data.hasMore} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}