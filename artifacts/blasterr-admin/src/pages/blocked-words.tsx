import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminBlockedWordsQueryKey,
  useCreateAdminBlockedWord,
  useDeleteAdminBlockedWord,
  useListAdminBlockedWords,
  useUpdateAdminBlockedWord,
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export default function BlockedWordsPage() {
  const [term, setTerm] = useState("");
  const [action, setAction] = useState<"block" | "flag">("block");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useListAdminBlockedWords();
  const create = useCreateAdminBlockedWord();
  const update = useUpdateAdminBlockedWord();
  const remove = useDeleteAdminBlockedWord();
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAdminBlockedWordsQueryKey() });

  if (query.isError) return <AdminErrorState error={query.error} />;

  const addTerm = () => {
    if (!term.trim()) return;
    create.mutate({ data: { term: term.trim(), action } }, {
      onSuccess: () => { void refresh(); setTerm(""); toast({ title: "Moderation term added" }); },
      onError: (error) => toast({ title: "Unable to add term", description: error.message, variant: "destructive" }),
    });
  };

  return <div className="space-y-6">
    <div><p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">Moderation controls</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Blocked Words</h1><p className="mt-1 text-sm text-muted-foreground">Maintain the persistent dictionary used for blocking or flagging content.</p></div>
    <Card className="rounded-sm"><CardHeader><CardTitle className="font-mono text-sm uppercase tracking-wider">Add moderation term</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 sm:flex-row"><Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Word or phrase" onKeyDown={(event) => { if (event.key === "Enter") addTerm(); }} /><Select value={action} onValueChange={(value) => setAction(value as typeof action)}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="block">Block</SelectItem><SelectItem value="flag">Flag</SelectItem></SelectContent></Select><Button disabled={!term.trim() || create.isPending} onClick={addTerm}><Plus className="mr-2 h-4 w-4" />Add term</Button></CardContent></Card>
    {query.isLoading ? <Skeleton className="h-52 w-full" /> : <Card className="rounded-sm"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Action</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead className="text-right">Controls</TableHead></TableRow></TableHeader><TableBody>
      {!query.data?.length ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No moderation terms configured.</TableCell></TableRow> : query.data.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.term}</TableCell><TableCell><Badge variant={item.action === "block" ? "destructive" : "outline"}>{item.action.toUpperCase()}</Badge></TableCell><TableCell>{item.status.replace("_", " ")}</TableCell><TableCell className="text-sm text-muted-foreground">{new Date(item.updatedAt).toLocaleString()}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: item.id, data: { status: item.status === "active" ? "disabled" : "active" } }, { onSuccess: () => void refresh() })}>{item.status === "active" ? "Disable" : "Enable"}</Button><Button size="icon" variant="ghost" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete “${item.term}”?`)) remove.mutate({ id: item.id }, { onSuccess: () => void refresh() }); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}
    </TableBody></Table></CardContent></Card>}
  </div>;
}