import { useGetTrending } from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Flame, MessageSquare, Target } from "lucide-react";

export default function TrendingPage() {
  const query = useGetTrending();

  if (query.isError) return <AdminErrorState error={query.error} />;
  if (query.isLoading) return <Skeleton className="h-96 w-full" />;

  const blasts = query.data?.blasts.slice(0, 20) ?? [];
  const targets = query.data?.targets.slice(0, 20) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Live platform signal
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Trending</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only view of the same trending data served to BLASTERR users.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Top Blasts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!blasts.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No trending Blasts.</p>
            ) : blasts.map((blast, index) => (
              <div key={blast.id} className="rounded-sm border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
                  <Badge variant="outline">{blast.viewCount.toLocaleString()} views</Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm">{blast.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  @{blast.author.username} · {blast.target.name}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Blasts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!targets.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No trending Targets.
                    </TableCell>
                  </TableRow>
                ) : targets.map((target, index) => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Flame className="h-3.5 w-3.5 text-primary" />#{index + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{target.name}</div>
                      <div className="text-xs text-muted-foreground">{target.location}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{target.type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{target.blastCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}