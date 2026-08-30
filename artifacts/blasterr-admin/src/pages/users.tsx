import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminUsers, 
  useUpdateAdminUser, 
  useDeleteAdminUser,
  getGetAdminUsersQueryKey,
  getGetAdminAuditLogQueryKey,
  getGetAdminAnalyticsQueryKey,
  AdminUserRole,
  AdminUserStatus
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, Trash2, Ban, CheckCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError, error } = useGetAdminUsers();
  const updateRole = useUpdateAdminUser();
  const updateStatus = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();

  const isPending = updateRole.isPending || updateStatus.isPending || deleteUser.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage user status and roles.</p>
        </div>
        <Card className="rounded-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const invalidateRelated = () => {
    queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminAnalyticsQueryKey() });
  };

  const handleUpdateRole = (id: string, role: AdminUserRole) => {
    updateRole.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "Role updated", description: "User role has been updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to update role.", variant: "destructive" })
      }
    );
  };

  const handleUpdateStatus = (id: string, status: AdminUserStatus) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "Status updated", description: "User status has been updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    deleteUser.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateRelated();
          toast({ title: "User deleted", description: "User has been permanently removed." });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage user status and roles.</p>
        </div>
      </div>

      <Card className="rounded-sm border-border shadow-none">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Platform Users ({data.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[250px] font-mono text-xs">USER</TableHead>
                <TableHead className="font-mono text-xs">ROLE</TableHead>
                <TableHead className="font-mono text-xs">STATUS</TableHead>
                <TableHead className="font-mono text-xs">BLASTS</TableHead>
                <TableHead className="font-mono text-xs text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    NO_USERS_FOUND
                  </TableCell>
                </TableRow>
              ) : (
                data.users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-sm">
                          <AvatarImage src={user.avatarUrl} alt={user.username} />
                          <AvatarFallback className="rounded-sm font-mono text-xs">{user.username.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm leading-none" data-testid={`text-username-${user.id}`}>@{user.username}</div>
                          <div className="text-xs text-muted-foreground mt-1">{user.displayName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? "default" : user.role === 'moderator' ? "secondary" : "outline"} className="font-mono text-[10px] rounded-sm uppercase">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'active' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-mono text-[10px] rounded-sm uppercase">ACTIVE</Badge>
                      ) : (
                        <Badge variant="destructive" className="font-mono text-[10px] rounded-sm uppercase">SUSPENDED</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.blastCount}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isPending} className="h-8 w-8 rounded-sm" data-testid={`button-actions-${user.id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm font-mono text-xs">
                          <DropdownMenuItem disabled={isPending} onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')} data-testid={`action-role-${user.id}`}>
                            <Shield className="w-4 h-4 mr-2" />
                            Toggle Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={isPending} onClick={() => handleUpdateStatus(user.id, user.status === 'active' ? 'suspended' : 'active')} data-testid={`action-suspend-${user.id}`}>
                            {user.status === 'active' ? <Ban className="w-4 h-4 mr-2 text-destructive" /> : <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />}
                            <span className={user.status === 'active' ? 'text-destructive' : 'text-emerald-500'}>
                              {user.status === 'active' ? 'Suspend User' : 'Unsuspend User'}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={isPending} onClick={() => handleDelete(user.id)} data-testid={`action-delete-${user.id}`}>
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            <span className="text-destructive">Delete User</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}