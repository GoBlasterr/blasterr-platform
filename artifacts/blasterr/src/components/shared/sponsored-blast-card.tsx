import { useEffect, useRef } from "react";
import { 
  useGetAdPlacement, 
  useRecordAdEvent,
  AdvertisementDelivery,
  GetAdPlacementPlacement
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, Megaphone } from "lucide-react";

export function FeedAdPlacement({ placement }: { placement: GetAdPlacementPlacement }) {
  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) {
    const stored = sessionStorage.getItem("blasterr-ad-session");
    sessionIdRef.current = stored || crypto.randomUUID();
    if (!stored) sessionStorage.setItem("blasterr-ad-session", sessionIdRef.current);
  }
  const { data: adData, isLoading, error } = useGetAdPlacement({ placement, sessionId: sessionIdRef.current });
  const ad = adData?.ad;

  if (isLoading || error || !ad) {
    return null;
  }

  return <SponsoredBlastCard ad={ad} placement={placement} sessionId={sessionIdRef.current} />;
}

export function SponsoredBlastCard({ 
  ad, 
  placement,
  sessionId,
}: { 
  ad: AdvertisementDelivery, 
  placement: GetAdPlacementPlacement,
  sessionId: string,
}) {
  const hasRecordedImpression = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const recordEvent = useRecordAdEvent();
  
  useEffect(() => {
    if (hasRecordedImpression.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasRecordedImpression.current) {
          hasRecordedImpression.current = true;
          recordEvent.mutate({
            data: {
              advertisementId: ad.id,
              eventType: "impression",
              placement: placement,
              sessionId,
              deliveryToken: ad.deliveryToken,
            }
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [ad.deliveryToken, ad.id, placement, recordEvent, sessionId]);

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ad.destinationUrl) return;
    
    // Record click
    recordEvent.mutate({
      data: {
        advertisementId: ad.id,
        eventType: "click",
        placement: placement,
        sessionId,
        deliveryToken: ad.deliveryToken,
      }
    });
    
    // Validate URL and open
    try {
      const url = new URL(ad.destinationUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        window.open(url.href, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      // Invalid URL, do nothing
    }
  };

  return (
    <div 
      ref={containerRef}
      className="p-5 border-b border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
      onClick={handleCTA}
    >
      <div className="flex gap-4">
        {/* Ad icon / pseudo avatar */}
        <div className="shrink-0 pt-1">
          <Avatar className="w-12 h-12 border border-primary/30 shadow-[0_0_10px_rgba(229,244,3,0.2)]">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="min-w-0 flex-1 font-bold text-white text-lg leading-tight break-words">
              {ad.headline}
            </span>
            
            <div className="shrink-0 flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground tracking-wider border border-white/5">
              <span>Sponsored</span>
            </div>
          </div>
          
          <div className="text-sm text-primary/80 mb-2 truncate font-medium">
            Ad by {ad.advertiserName}
          </div>

          <p className="mt-2 text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words">
            {ad.body}
          </p>

          {ad.mediaUrl && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-primary/20 bg-black/50">
              <img src={ad.mediaUrl} alt="Advertisement media" className="w-full h-auto object-cover max-h-96 hover:opacity-90 transition-opacity" />
            </div>
          )}

          {/* Action */}
          {ad.destinationUrl && (
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleCTA}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-6 shadow-[0_0_15px_rgba(229,244,3,0.3)] transition-all hover:shadow-[0_0_20px_rgba(229,244,3,0.5)] group"
              >
                Learn More
                <ExternalLink className="h-4 w-4 ml-2 opacity-70 group-hover:opacity-100 transition-opacity" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
