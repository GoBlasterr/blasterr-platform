import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAdminFeatures, 
  useUpdateAdminFeature,
  getGetAdminFeaturesQueryKey,
  getGetAdminAuditLogQueryKey
} from "@workspace/api-client-react";
import { AdminErrorState } from "@/components/layout/admin-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ToggleRight } from "lucide-react";

export default function FeatureControlsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: features, isLoading, isError, error } = useGetAdminFeatures();
  const updateFeature = useUpdateAdminFeature();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Controls</h1>
          <p className="text-muted-foreground mt-1">Toggle platform feature flags.</p>
        </div>
        <Card className="rounded-sm"><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (isError || !features) {
    return <AdminErrorState error={error} />;
  }

  const handleToggle = (key: string, enabled: boolean) => {
    updateFeature.mutate(
      { key, data: { enabled } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminFeaturesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminAuditLogQueryKey() });
          toast({ title: "Feature updated", description: `Feature ${key} is now ${enabled ? 'enabled' : 'disabled'}.` });
        },
        onError: () => toast({ title: "Error", description: "Failed to update feature.", variant: "destructive" })
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Feature Controls</h1>
          <p className="text-muted-foreground mt-1 text-sm">Toggle platform feature flags globally.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {features.length === 0 ? (
          <Card className="rounded-sm border-dashed text-center py-12 shadow-none">
            <ToggleRight className="w-12 h-12 mx-auto text-muted/50 mb-4" />
            <p className="font-mono text-muted-foreground uppercase text-sm">NO_FEATURE_FLAGS</p>
          </Card>
        ) : (
          features.map(feature => (
            <Card key={feature.key} className="rounded-sm border-border shadow-none" data-testid={`feature-${feature.key}`}>
              <CardContent className="p-6 flex items-start justify-between gap-4">
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg font-mono">{feature.label}</h3>
                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-sm uppercase text-muted-foreground border">
                      {feature.key}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-2 opacity-50">
                    Last updated: {format(new Date(feature.updatedAt), "yyyy-MM-dd HH:mm")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 mt-1">
                  <Switch 
                    checked={feature.enabled} 
                    onCheckedChange={(c) => handleToggle(feature.key, c)}
                    disabled={updateFeature.isPending}
                    data-testid={`switch-${feature.key}`}
                  />
                  <span className={`text-[10px] font-mono font-bold uppercase ${feature.enabled ? 'text-primary' : 'text-muted-foreground'}`}>
                    {feature.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}