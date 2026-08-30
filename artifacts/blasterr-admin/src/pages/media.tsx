import {
  getGetAdminClipsQueryKey,
  useGetAdminClips,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, Loader2, CheckCircle2, AlertCircle, PlaySquare, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MediaPage() {
  const { data: media, isLoading, isError } = useGetAdminClips({
    query: {
      queryKey: getGetAdminClipsQueryKey(),
      retry: false,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media & Render Pipeline</h1>
          <p className="text-muted-foreground mt-1">Status of automated clip generation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !media) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-xl rounded-sm border-destructive/30 shadow-none">
          <CardHeader>
            <CardTitle className="font-mono text-xl uppercase text-destructive">
              Admin authorization required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The media pipeline API rejected this session. Sign in with a
              server-authorized BLASTERR administrator account to view render
              jobs. Access is enforced by the backend.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Media & Render Pipeline</h1>
          <p className="text-muted-foreground mt-1 text-sm">Status of automated clip generation.</p>
        </div>
        <Button disabled className="rounded-sm font-mono tracking-wide" data-testid="button-force-render">
          FORCE_RENDER_ALL (BACKEND REQUIRED)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-sm border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Total Clips
            </CardTitle>
            <Video className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight" data-testid="stat-total-clips">
              {media.clipCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Active Renders
            </CardTitle>
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-primary" data-testid="stat-active-renders">
              {media.activeRenders.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight" data-testid="stat-completed-clips">
              {media.completedCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Failed
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight" data-testid="stat-failed-clips">
              {media.failedCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Recent Render Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px] font-mono text-xs">ID</TableHead>
                <TableHead className="font-mono text-xs">TITLE</TableHead>
                <TableHead className="font-mono text-xs">STYLE</TableHead>
                <TableHead className="font-mono text-xs">CREATOR</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
                <TableHead className="text-right font-mono text-xs">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {media.clips.map((clip) => (
                <TableRow key={clip.id} data-testid={`row-clip-${clip.id}`}>
                  <TableCell className="font-mono text-xs font-bold">{clip.id.substring(0, 8)}</TableCell>
                  <TableCell className="font-medium">{clip.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-background">
                      {clip.style}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{clip.creator.username}</TableCell>
                  <TableCell>
                    <StatusBadge status={clip.renderStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled className="h-8 w-8 text-muted-foreground" aria-label="Action (Backend required)" title="Backend required">
                      {clip.renderStatus === 'COMPLETED' ? (
                        <PlaySquare className="w-4 h-4" />
                      ) : (
                        <MoreHorizontal className="w-4 h-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {media.clips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    NO_RENDER_JOBS_FOUND
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED' || status === 'SHARED') {
    return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-mono text-[10px] rounded-sm">COMPLETED</Badge>;
  }
  if (status === 'FAILED') {
    return <Badge variant="destructive" className="font-mono text-[10px] rounded-sm">FAILED</Badge>;
  }
  if (status === 'PROCESSING' || status === 'QUEUED') {
    return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-mono text-[10px] rounded-sm flex items-center gap-1 w-fit">
      {status === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status}
    </Badge>;
  }
  
  return <Badge variant="secondary" className="font-mono text-[10px] rounded-sm">{status}</Badge>;
}
