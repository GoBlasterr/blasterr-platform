import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
      <h1 className="text-6xl font-extrabold text-primary font-mono mb-4">404</h1>
      <h2 className="text-xl font-bold tracking-tight mb-2 uppercase">
        Sector Not Found
      </h2>
      <p className="text-muted-foreground mb-8">
        The administrative sector you are looking for does not exist or has been reclassified.
      </p>
      <Link href="/overview" data-testid="link-home">
        <Button className="font-mono rounded-sm">
          RETURN_TO_OVERVIEW
        </Button>
      </Link>
    </div>
  );
}
