import { useListAdminAdvertisements, getListAdminAdvertisementsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function LiveAdsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const queryParams = { 
    page, 
    limit: 20, 
    status: "active",
    ...(search ? { search } : {})
  };

  const { data, isLoading } = useListAdminAdvertisements(queryParams, {
    query: { queryKey: getListAdminAdvertisementsQueryKey(queryParams) }
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Ads</h1>
        <p className="text-muted-foreground">Currently delivering advertisements on the network.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search live ads..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creative Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Campaign ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No active ads.</TableCell></TableRow>
              ) : (
                data?.items.map(ad => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {ad.name}
                        {ad.destinationUrl && (
                          <a href={ad.destinationUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="w-3 h-3" /></a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{ad.id}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{ad.placement}</Badge></TableCell>
                    <TableCell>
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">ACTIVE</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{ad.campaignId.slice(0, 12)}...</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.limit + 1} to {Math.min(page * data.limit, data.total)} of {data.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!data.hasMore}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
