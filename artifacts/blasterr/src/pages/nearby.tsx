import { getGetFeedQueryKey, useGetFeed } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, LocateFixed, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Seo } from "@/components/seo";

type LocationStatus = "requesting" | "ready" | "denied" | "unavailable";

export default function Nearby() {
  const [radius, setRadius] = useState(20);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("requesting");
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationAttemptRef = useRef(0);

  const requestLocation = useCallback(() => {
    const attempt = ++locationAttemptRef.current;
    setLocationStatus("requesting");
    setPosition(null);

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      if (locationAttemptRef.current === attempt) {
        setLocationStatus("unavailable");
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.clearTimeout(fallbackTimer);
        if (locationAttemptRef.current !== attempt) return;
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationStatus("ready");
      },
      (error) => {
        window.clearTimeout(fallbackTimer);
        if (locationAttemptRef.current !== attempt) return;
        setLocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
    return () => {
      locationAttemptRef.current += 1;
    };
  }, [requestLocation]);

  const {
    data: feedData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetFeed(
    {
      tab: "nearby",
      page: 1,
      latitude: position?.latitude,
      longitude: position?.longitude,
      radius,
    },
    {
      query: {
        queryKey: getGetFeedQueryKey({
          tab: "nearby",
          page: 1,
          latitude: position?.latitude,
          longitude: position?.longitude,
          radius,
        }),
        enabled: locationStatus === "ready" && position !== null,
        retry: false,
      },
    },
  );

  const statusPanel = locationStatus !== "ready" ? (
    <div className="m-4 rounded-2xl border border-white/10 bg-card p-8 text-center sm:m-6">
      {locationStatus === "requesting" ? (
        <>
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <h3 className="mb-2 text-xl font-bold text-white">Locating your current sector</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Allow location access to scan for Blasts nearby. Your exact coordinates are used only for this request.
          </p>
        </>
      ) : (
        <>
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-400" />
          <h3 className="mb-2 text-xl font-bold text-white">
            {locationStatus === "denied" ? "Location access is blocked" : "Location is unavailable"}
          </h3>
          <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
            {locationStatus === "denied"
              ? "Enable location permission for BLASTERR in your browser settings, then try again."
              : "We could not determine your location. Check your device location services and connection."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={requestLocation}
            className="rounded-full border-white/20 text-white hover:bg-white/10"
          >
            <LocateFixed className="h-4 w-4" />
            Try location again
          </Button>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <Seo
        title="Explore Nearby Blasts | Blasterr"
        description="Discover Blasts and conversations happening near you on Blasterr."
        canonicalPath="/nearby"
      />
      <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4">
        <div className="flex items-center">
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Nearby Scanner
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Targets within <span className="font-semibold text-white">{radius} miles</span> of your current location
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scan radius
            <select
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="h-10 rounded-full border border-white/15 bg-card px-4 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-primary"
              aria-label="Nearby scan radius"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={20}>20 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 pb-24 md:pb-0" aria-live="polite">
        {statusPanel ?? (isLoading || isFetching ? (
          <>
             <BlastSkeleton />
             <BlastSkeleton />
          </>
        ) : isError ? (
          <div className="m-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center sm:m-6">
            <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" />
            <h3 className="mb-2 text-xl font-bold text-white">Nearby scan interrupted</h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
              We could not load nearby Blasts. Your location was not saved.
            </p>
            <Button type="button" variant="outline" onClick={() => refetch()} className="rounded-full border-white/20">
              Retry scan
            </Button>
          </div>
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
             <p className="max-w-sm">
               There are no Blasts about Targets within {feedData?.radiusMiles ?? radius} miles. Try a wider scan radius.
             </p>
          </div>
        ))}
      </div>
      </div>
    </>
  );
}
