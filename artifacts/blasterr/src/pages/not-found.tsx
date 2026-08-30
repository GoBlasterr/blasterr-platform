import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-destructive/10 rounded-full blur-[100px]"></div>
      
      <div className="font-display font-black text-9xl text-white/5 relative z-10 mb-4 tracking-tighter">
        404
      </div>
      <div className="relative z-10 max-w-md">
        <h1 className="font-display font-bold text-3xl text-white mb-4">Signal Lost</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          The target sector you're looking for doesn't exist in this universe. It may have been destroyed or relocated.
        </p>
        <Link href="/home">
          <Button className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-8 h-12">
            Return to Base
          </Button>
        </Link>
      </div>
    </div>
  );
}
