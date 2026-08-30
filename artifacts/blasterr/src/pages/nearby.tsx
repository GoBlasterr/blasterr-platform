import { useGetFeed } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function Nearby() {
  // In a real app we'd get browser geolocation first, then pass coords
  const { data: feedData, isLoading } = useGetFeed({ tab: 'nearby', page: 1 });

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-white/10 hover:text-white"
              aria-label="Back to home feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Nearby Scanner
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Targets within your current sector</p>
      </div>

      <div className="flex-1 pb-24 md:pb-0">
        {isLoading ? (
          <>
             <BlastSkeleton />
             <BlastSkeleton />
          </>
        ) : feedData?.items?.length ? (
          feedData.items.map((blast: any) => (
            <BlastCard key={blast.id} blast={blast} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground h-64">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 relative">
               <MapPin className="w-8 h-8 opacity-50" />
               <div className="absolute inset-0 border border-primary/50 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No local signals detected</h3>
            <p className="max-w-xs">There are no Blasts about targets in your immediate vicinity. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}
