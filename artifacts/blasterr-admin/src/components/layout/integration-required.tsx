import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IntegrationRequired({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded-sm mb-6">
        <AlertTriangle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2 uppercase font-mono">
        Backend Connection Required
      </h2>
      <p className="text-muted-foreground mb-8">
        The <span className="font-semibold text-foreground">{moduleName}</span> module requires backend API integration. Live data cannot be safely mocked in this environment.
      </p>
      <div className="flex gap-4">
        <Button variant="outline" className="font-mono rounded-sm" onClick={() => window.history.back()} data-testid="button-go-back">
          GO_BACK
        </Button>
      </div>
    </div>
  );
}
