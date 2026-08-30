import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminErrorState({ 
  error,
  title, 
  message 
}: { 
  error?: any;
  title?: string;
  message?: string;
}) {
  let displayTitle = title || "Admin authorization required";
  let displayMessage = message || "API rejected this session. Sign in with a server-authorized BLASTERR administrator account.";

  if (error) {
    const status = error?.status || error?.response?.status;
    if (status !== 401 && status !== 403) {
      displayTitle = title || "System Error";
      displayMessage = message || error?.message || "An unexpected error occurred while communicating with the server.";
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-xl rounded-sm border-destructive/30 shadow-none">
        <CardHeader>
          <CardTitle className="font-mono text-xl uppercase text-destructive">
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{displayMessage}</p>
        </CardContent>
      </Card>
    </div>
  );
}