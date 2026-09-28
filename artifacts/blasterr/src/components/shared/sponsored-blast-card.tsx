import { useEffect, useRef, useState } from "react";
import { 
  useGetAdPlacement, 
  useRecordAdEvent,
  AdvertisementDelivery,
  GetAdPlacementPlacement,
  getGetAdPlacementQueryKey,
} from "@workspace/api-client-react";
export function FeedAdPlacement({ placement }: { placement: GetAdPlacementPlacement }) {
  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) {
    const stored = sessionStorage.getItem("blasterr-ad-session");
    sessionIdRef.current = stored || crypto.randomUUID();
    if (!stored) sessionStorage.setItem("blasterr-ad-session", sessionIdRef.current);
  }
  return placement === "right_rail"
    ? <RotatingRightRailAd sessionId={sessionIdRef.current} />
    : <SinglePlacementAd placement={placement} sessionId={sessionIdRef.current} />;
}

function SinglePlacementAd({
  placement,
  sessionId,
}: {
  placement: GetAdPlacementPlacement;
  sessionId: string;
}) {
  const { data: adData, isLoading, error } = useGetAdPlacement({ placement, sessionId });
  const ad = adData?.ad;

  if (isLoading || error || !ad) {
    return null;
  }

  return <SponsoredBlastCard ad={ad} placement={placement} sessionId={sessionId} />;
}

function RotatingRightRailAd({ sessionId }: { sessionId: string }) {
  const [afterAdvertisementId, setAfterAdvertisementId] = useState<string | undefined>();
  const [rotationTick, setRotationTick] = useState(0);
  const [currentAd, setCurrentAd] = useState<AdvertisementDelivery | null>(null);
  const lastRequestedAdIdRef = useRef<string | undefined>(undefined);
  const queryParams = {
    placement: "right_rail" as const,
    sessionId,
    ...(afterAdvertisementId ? { afterAdvertisementId } : {}),
  };
  const query = useGetAdPlacement(queryParams, {
    query: { queryKey: getGetAdPlacementQueryKey(queryParams), staleTime: 0 },
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setCurrentAd(query.data.ad);
    }
  }, [query.data]);

  useEffect(() => {
    if (rotationTick === 0) return;
    if (lastRequestedAdIdRef.current === afterAdvertisementId) {
      void query.refetch();
      return;
    }
    lastRequestedAdIdRef.current = afterAdvertisementId;
  }, [afterAdvertisementId, query.refetch, rotationTick]);

  useEffect(() => {
    if (!currentAd) return;
    const interval = window.setInterval(() => {
      setAfterAdvertisementId(currentAd.id);
      setRotationTick((tick) => tick + 1);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [currentAd?.id]);

  const ad = currentAd ?? query.data?.ad ?? null;
  if (!ad) return null;
  return <SponsoredBlastCard ad={ad} placement="right_rail" sessionId={sessionId} />;
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
  const recordedImpressionDelivery = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const recordEvent = useRecordAdEvent();
  const homeFeedImageHeight = {
    small: "h-32",
    medium: "h-64",
    large: "h-96",
  }[ad.homeFeedHeight];
  const destinationUrl = (() => {
    if (!ad.destinationUrl) return null;
    try {
      const url = new URL(ad.destinationUrl);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  })();
  
  useEffect(() => {
    if (recordedImpressionDelivery.current === ad.deliveryToken) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && recordedImpressionDelivery.current !== ad.deliveryToken) {
          recordedImpressionDelivery.current = ad.deliveryToken;
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

  const recordClick = () => recordEvent.mutate({
    data: {
      advertisementId: ad.id,
      eventType: "click",
      placement,
      sessionId,
      deliveryToken: ad.deliveryToken,
    }
  });

  const handleCTA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!destinationUrl) return;
    recordClick();
    window.open(destinationUrl, "_blank", "noopener,noreferrer");
  };

  if (!ad.mediaUrl) return null;

  const image = (
    <img
      src={ad.mediaUrl}
      alt="Advertisement"
      className={`block w-full object-contain ${placement === "home_feed" ? homeFeedImageHeight : "h-auto max-h-96"}`}
    />
  );

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      {destinationUrl ? (
        <button
          type="button"
          aria-label="Open advertisement"
          onClick={handleCTA}
          className="block w-full cursor-pointer bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {image}
        </button>
      ) : image}
    </div>
  );
}
