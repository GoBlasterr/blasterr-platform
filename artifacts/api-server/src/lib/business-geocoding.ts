import { db, targetsTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const REQUEST_INTERVAL_MS = 1_100;
const NO_MATCH_CACHE_MS = 24 * 60 * 60 * 1_000;
const FAILURE_CACHE_MS = 60 * 1_000;

export type BusinessAddress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
};

export type GeocodedCoordinates = {
  latitude: number;
  longitude: number;
};

export type BusinessGeocodeResult = {
  attempted: boolean;
  coordinates?: GeocodedCoordinates;
  persisted?: boolean;
};

type NominatimResult = {
  lat?: unknown;
  lon?: unknown;
  address?: {
    house_number?: unknown;
    road?: unknown;
  };
};

const negativeResults = new Map<string, number>();
const inFlight = new Map<string, Promise<BusinessGeocodeResult>>();

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function houseNumber(street: string) {
  return street.trim().match(/^(\d+[a-z]?(?:[-/]\d+[a-z]?)?)(?:\s|,|$)/i)?.[1];
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function geocodeBusinessAddress(
  targetId: string,
  address: BusinessAddress,
): Promise<BusinessGeocodeResult> {
  const expectedHouseNumber = houseNumber(address.street);
  if (!expectedHouseNumber || !address.city.trim() || !address.state.trim()) {
    return { attempted: false };
  }

  const key = [address.street, address.city, address.state, address.postalCode]
    .map(normalize)
    .join("|");
  const cachedUntil = negativeResults.get(key);
  if (cachedUntil && cachedUntil > Date.now()) return { attempted: false };
  if (cachedUntil) negativeResults.delete(key);

  const existingRequest = inFlight.get(key);
  if (existingRequest) return existingRequest;

  const request = db.transaction(async (tx): Promise<BusinessGeocodeResult> => {
    // Share the one-request-per-1.1-second limit across API instances.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('blasterr-nominatim-geocode-v1'))`);
    const [currentTarget] = await tx.select({
      latitude: targetsTable.latitude,
      longitude: targetsTable.longitude,
    }).from(targetsTable).where(eq(targetsTable.id, targetId));
    if (
      currentTarget
      && currentTarget.latitude !== null
      && currentTarget.longitude !== null
    ) {
      return { attempted: false };
    }
    const startedAt = Date.now();

    try {
      const query = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        limit: "1",
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        country: "United States",
        countrycodes: "us",
      });
      if (address.postalCode.trim()) query.set("postalcode", address.postalCode.trim());

      const response = await fetch(`${NOMINATIM_SEARCH_URL}?${query}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BLASTERR/1.0 (Nearby business address geocoding)",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`OpenStreetMap geocoding returned HTTP ${response.status}`);
      }

      const results = await response.json() as NominatimResult[];
      const result = Array.isArray(results) ? results[0] : undefined;
      const matchedHouseNumber = typeof result?.address?.house_number === "string"
        ? result.address.house_number
        : "";
      const road = typeof result?.address?.road === "string" ? result.address.road : "";
      const latitude = Number(result?.lat);
      const longitude = Number(result?.lon);
      const isExactStreetMatch =
        normalize(matchedHouseNumber) === normalize(expectedHouseNumber)
        && Boolean(road)
        && Number.isFinite(latitude)
        && latitude >= -90
        && latitude <= 90
        && Number.isFinite(longitude)
        && longitude >= -180
        && longitude <= 180;

      if (!isExactStreetMatch) {
        negativeResults.set(key, Date.now() + NO_MATCH_CACHE_MS);
        return { attempted: true };
      }

      const coordinates = { latitude, longitude };
      const [updated] = await tx.update(targetsTable).set({
        latitude,
        longitude,
        updatedAt: new Date(),
      }).where(and(
        eq(targetsTable.id, targetId),
        isNull(targetsTable.latitude),
        isNull(targetsTable.longitude),
      )).returning({ id: targetsTable.id });

      return {
        attempted: true,
        coordinates,
        persisted: Boolean(updated),
      };
    } finally {
      // Keep the distributed lock until the minimum interval has elapsed,
      // including when the provider responds quickly or errors.
      await delay(Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - startedAt)));
    }
  }).catch((error: unknown) => {
    negativeResults.set(key, Date.now() + FAILURE_CACHE_MS);
    throw error;
  });

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}