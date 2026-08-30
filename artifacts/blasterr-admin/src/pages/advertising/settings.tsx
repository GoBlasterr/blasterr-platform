import { useState, useEffect } from "react";
import { 
  useGetAdminAdvertisingSettings, 
  useUpdateAdminAdvertisingSettings,
  getGetAdminAdvertisingSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const placements = [
  ["home_feed", "Home Feed"],
  ["following_feed", "Following Feed"],
  ["search", "Search"],
  ["trending", "Trending"],
  ["profile", "Profiles"],
  ["clips", "Clips"],
] as const;

export default function AdvertisingSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useGetAdminAdvertisingSettings();
  const updateMutation = useUpdateAdminAdvertisingSettings();

  const [localSettings, setLocalSettings] = useState({
    enabled: true,
    emergencyShutdown: false,
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<any>({});
  const [placementSettings, setPlacementSettings] = useState<Record<string, boolean>>({});
  const [maxImpressionsPerSession, setMaxImpressionsPerSession] = useState(3);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        enabled: settings.enabled,
        emergencyShutdown: settings.emergencyShutdown,
      });
      setPlacementSettings(Object.fromEntries(
        placements.map(([key]) => [key, settings.placementSettings[key] !== false])
      ));
      const configuredCap = Number(settings.frequencySettings.maxImpressionsPerSession);
      setMaxImpressionsPerSession(Number.isFinite(configuredCap) && configuredCap > 0 ? configuredCap : 3);
    }
  }, [settings]);

  const handleSave = (updates: any) => {
    setPendingUpdates(updates);
    setIsConfirmOpen(true);
  };

  const confirmSave = () => {
    if (!reason.trim()) {
      toast({ title: "Reason Required", description: "Audit reason is required for settings changes.", variant: "destructive" });
      return;
    }

    updateMutation.mutate({
      data: {
        ...pendingUpdates,
        reason: reason.trim()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings Updated", description: "Advertising platform settings have been updated." });
        queryClient.invalidateQueries({ queryKey: getGetAdminAdvertisingSettingsQueryKey() });
        setIsConfirmOpen(false);
        setReason("");
        setPendingUpdates({});
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Configure global advertising delivery and safety controls.</p>
      </div>

      {settings?.emergencyShutdown && (
        <div className="bg-destructive text-destructive-foreground p-4 rounded-md flex items-start gap-3 border border-destructive-border shadow-lg">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-lg">EMERGENCY SHUTDOWN ACTIVE</h4>
            <p className="mt-1">All ad delivery is currently halted network-wide. No impressions are being served.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Global Delivery State</CardTitle>
          <CardDescription>Master controls for the advertising platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Advertising Engine</Label>
              <p className="text-sm text-muted-foreground">When disabled, new campaigns cannot be created and the engine stops bidding.</p>
            </div>
            <Switch 
              checked={localSettings.enabled} 
              onCheckedChange={checked => {
                setLocalSettings(s => ({...s, enabled: checked}));
                handleSave({ enabled: checked });
              }}
            />
          </div>

          <div className="pt-6 border-t">
            <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  <Label className="text-base text-destructive font-bold">Emergency Shutdown</Label>
                </div>
                <p className="text-sm text-muted-foreground">Instantly pause all ad delivery across the entire network. Overrides all other settings.</p>
              </div>
              <Switch 
                checked={localSettings.emergencyShutdown} 
                onCheckedChange={checked => {
                  setLocalSettings(s => ({...s, emergencyShutdown: checked}));
                  handleSave({ emergencyShutdown: checked });
                }}
                className="data-[state=checked]:bg-destructive"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Placement Configurations</CardTitle>
          <CardDescription>Control where approved advertising may be delivered.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {placements.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <Label htmlFor={`placement-${key}`}>{label}</Label>
              <Switch
                id={`placement-${key}`}
                checked={placementSettings[key] !== false}
                onCheckedChange={(checked) => {
                  const next = { ...placementSettings, [key]: checked };
                  setPlacementSettings(next);
                  handleSave({ placementSettings: next });
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Frequency Capping</CardTitle>
          <CardDescription>Global limits on ad exposure per user.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="max-impressions">Maximum ad deliveries per anonymous session</Label>
          <div className="flex max-w-sm gap-2">
            <Input
              id="max-impressions"
              type="number"
              min={1}
              max={100}
              value={maxImpressionsPerSession}
              onChange={(event) => setMaxImpressionsPerSession(Number(event.target.value))}
            />
            <Button
              variant="outline"
              disabled={!Number.isFinite(maxImpressionsPerSession) || maxImpressionsPerSession < 1 || maxImpressionsPerSession > 100}
              onClick={() => handleSave({ frequencySettings: { ...settings?.frequencySettings, maxImpressionsPerSession } })}
            >
              Save limit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The API reserves each delivery before returning paid content and stops serving at this limit. Sessions contain no direct personal identifier.</p>
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Settings Change</DialogTitle>
            <DialogDescription>
              Changes to advertising settings affect network-wide revenue and delivery. 
              Please provide a reason for the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Audit Reason</Label>
            <Textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="e.g. Halting due to major breaking news event..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsConfirmOpen(false);
              setLocalSettings({ enabled: settings?.enabled ?? true, emergencyShutdown: settings?.emergencyShutdown ?? false });
            }}>Cancel</Button>
            <Button onClick={confirmSave} disabled={updateMutation.isPending || !reason.trim()}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save and Log Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
