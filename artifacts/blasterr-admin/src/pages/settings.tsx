import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminSettings, 
  useUpdateAdminSettings,
  getGetAdminSettingsQueryKey,
  getGetAdminAuditLogQueryKey
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError, error } = useGetAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const [formData, setFormData] = useState({
    maintenanceMode: false,
    contentReviewMode: false,
    supportEmail: ""
  });

  useEffect(() => {
    if (data) {
      setFormData({
        maintenanceMode: data.maintenanceMode,
        contentReviewMode: data.contentReviewMode,
        supportEmail: data.supportEmail
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Platform moderation settings.</p>
        </div>
        <Card className="rounded-sm max-w-2xl"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !data) {
    return <AdminErrorState error={error} />;
  }

  const handleSave = () => {
    updateSettings.mutate(
      { data: formData },
      {
        onSuccess: (result) => {
          queryClient.setQueryData(getGetAdminSettingsQueryKey(), result);
          queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
          toast({ title: "Settings saved", description: "Platform settings have been updated successfully." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform moderation settings.</p>
        </div>
      </div>

      <Card className="rounded-sm border-border shadow-none max-w-2xl">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="font-mono uppercase tracking-wider text-sm">Core Configuration</CardTitle>
          <CardDescription>Global toggles affecting all users.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <Label className="font-bold text-base font-mono uppercase">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Takes the platform offline for everyone except administrators.</p>
            </div>
            <Switch 
              checked={formData.maintenanceMode} 
              onCheckedChange={(c) => setFormData(prev => ({...prev, maintenanceMode: c}))}
              disabled={updateSettings.isPending}
              data-testid="switch-maintenance"
            />
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <Label className="font-bold text-base font-mono uppercase">Content Review Mode</Label>
              <p className="text-sm text-muted-foreground">All new Blasts must be approved before becoming publicly visible.</p>
            </div>
            <Switch 
              checked={formData.contentReviewMode} 
              onCheckedChange={(c) => setFormData(prev => ({...prev, contentReviewMode: c}))}
              disabled={updateSettings.isPending}
              data-testid="switch-review-mode"
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label className="font-bold text-base font-mono uppercase">Support Contact Email</Label>
            <p className="text-sm text-muted-foreground">The email address users should contact for account issues and appeals.</p>
            <Input 
              type="email" 
              value={formData.supportEmail}
              onChange={(e) => setFormData(prev => ({...prev, supportEmail: e.target.value}))}
              disabled={updateSettings.isPending}
              className="rounded-sm font-mono"
              placeholder="support@blasterr.com"
              data-testid="input-support-email"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="rounded-sm font-mono tracking-wide"
            data-testid="button-save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            SAVE_CONFIGURATION
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}