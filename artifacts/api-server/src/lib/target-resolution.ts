export type ResolvableTarget = {
  id: string;
  name: string;
  type: string;
  location: string;
};

export type TargetMatchKind =
  | "exact"
  | "alias"
  | "likely"
  | "same-name-different-location";

export type TargetMatch<T extends ResolvableTarget> = {
  target: T;
  matchKind: TargetMatchKind;
  matchScore: number;
  matchReason: string;
  isHardDuplicate: boolean;
};

type TargetResolutionInput = {
  name: string;
  type?: string;
  location?: string;
};

const directAliases: Record<string, string> = {
  "atl": "atlanta",
  "chi": "chicago",
  "dc": "washington dc",
  "d c": "washington dc",
  "la": "los angeles",
  "l a": "los angeles",
  "nyc": "new york city",
  "ny": "new york",
  "sf": "san francisco",
};

export function normalizeTargetText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function targetIdentityLockKey(input: {
  type: string;
  name: string;
  location: string;
}): string {
  return JSON.stringify([
    input.type,
    normalizeTargetText(input.name),
    normalizeTargetText(input.location),
  ]);
}

function canonicalTargetName(value: string): string {
  const normalized = normalizeTargetText(value);
  return directAliases[normalized] ?? normalized;
}

function locationIdentity(value: string): {
  full: string;
  city: string;
  jurisdiction: string;
} {
  const full = normalizeTargetText(value);
  const commaParts = value
    .split(",")
    .map((part) => normalizeTargetText(part))
    .filter(Boolean);

  let city = commaParts[0] ?? full;
  let jurisdiction = commaParts.slice(1).join(" ");
  if (!jurisdiction && commaParts.length <= 1) {
    const tokens = full.split(" ").filter(Boolean);
    const finalToken = tokens.at(-1) ?? "";
    if (tokens.length > 1 && /^[a-z]{2}$/.test(finalToken)) {
      city = tokens.slice(0, -1).join(" ");
      jurisdiction = finalToken;
    }
  }

  return {
    full,
    city: directAliases[city] ?? city,
    jurisdiction,
  };
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function similarity(left: string, right: string): number {
  const compactLeft = left.replace(/\s+/g, "");
  const compactRight = right.replace(/\s+/g, "");
  const longest = Math.max(compactLeft.length, compactRight.length);
  if (!longest) return 1;
  return 1 - levenshteinDistance(compactLeft, compactRight) / longest;
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (!union.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  return intersection.length / union.size;
}

export function findTargetMatches<T extends ResolvableTarget>(
  targets: T[],
  input: TargetResolutionInput,
): TargetMatch<T>[] {
  const rawInputName = normalizeTargetText(input.name);
  const inputName = canonicalTargetName(input.name);
  const inputLocation = locationIdentity(input.location ?? "");
  const inputType = input.type && input.type !== "other" ? input.type : "";

  if (!inputName) return [];

  return targets
    .map((target): TargetMatch<T> | null => {
      const rawTargetName = normalizeTargetText(target.name);
      const targetName = canonicalTargetName(target.name);
      const targetLocation = locationIdentity(target.location);
      const exactCanonicalName = inputName === targetName;
      const aliasMatch = exactCanonicalName && rawInputName !== rawTargetName;
      const nameSimilarity = exactCanonicalName
        ? 1
        : Math.max(similarity(inputName, targetName), tokenOverlap(inputName, targetName));
      const containsName = targetName.includes(inputName) || inputName.includes(targetName);

      if (!exactCanonicalName && !containsName && nameSimilarity < 0.58) {
        return null;
      }

      const sameType = !inputType || inputType === target.type;
      const hasLocationContext = Boolean(inputLocation.full && targetLocation.full);
      const sameLocation = hasLocationContext && (
        inputLocation.full === targetLocation.full ||
        (
          inputLocation.city === targetLocation.city &&
          !inputLocation.jurisdiction &&
          !targetLocation.jurisdiction
        )
      );
      const differentLocation = hasLocationContext && (
        inputLocation.city !== targetLocation.city ||
        (
          Boolean(inputLocation.jurisdiction) &&
          Boolean(targetLocation.jurisdiction) &&
          inputLocation.jurisdiction !== targetLocation.jurisdiction
        )
      );
      const isHardDuplicate = sameType && (
        (exactCanonicalName && (
          sameLocation ||
          !inputLocation.full ||
          (target.type === "place" && aliasMatch)
        )) ||
        (!exactCanonicalName && nameSimilarity >= 0.88 && sameLocation)
      );

      let matchKind: TargetMatchKind = "likely";
      let matchReason = "Name is similar";
      if (exactCanonicalName && differentLocation) {
        matchKind = "same-name-different-location";
        matchReason = `Same name, different location: ${target.location || "location not listed"}`;
      } else if (aliasMatch) {
        matchKind = "alias";
        matchReason = `"${input.name.trim()}" is a known alias for ${target.name}`;
      } else if (exactCanonicalName) {
        matchKind = "exact";
        matchReason = sameLocation
          ? `Exact name and location match`
          : `Exact name match`;
      } else if (nameSimilarity >= 0.78) {
        matchReason = `Possible spelling match`;
      } else {
        matchReason = `Related name match`;
      }

      const locationBoost = sameLocation ? 0.08 : differentLocation ? -0.08 : 0;
      const typeBoost = inputType ? (sameType ? 0.04 : -0.08) : 0;
      return {
        target,
        matchKind,
        matchScore: Number(Math.max(0, Math.min(1, nameSimilarity + locationBoost + typeBoost)).toFixed(3)),
        matchReason,
        isHardDuplicate,
      };
    })
    .filter((match): match is TargetMatch<T> => Boolean(match))
    .sort((left, right) => {
      if (left.isHardDuplicate !== right.isHardDuplicate) return left.isHardDuplicate ? -1 : 1;
      return right.matchScore - left.matchScore;
    })
    .slice(0, 8);
}
