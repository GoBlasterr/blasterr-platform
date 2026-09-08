import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const sourceRoots = [
  resolve(process.cwd(), "artifacts/blasterr/src"),
  resolve(process.cwd(), "../blasterr/src"),
];

export function normalizeInterfaceCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

function usableCopy(value: string): boolean {
  return value.length >= 2 && value.length <= 240 && /\p{L}/u.test(value);
}

export function extractInterfaceCopy(source: string): string[] {
  const found = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeInterfaceCopy(value);
    if (usableCopy(normalized)) found.add(normalized);
  };

  for (const match of source.matchAll(/>([^<>{]+)[<{]/g)) add(match[1] ?? "");
  for (const match of source.matchAll(/\b(?:placeholder|title|aria-label|alt)=["']([^"']+)["']/g)) add(match[1] ?? "");
  for (const match of source.matchAll(/(?:\?|:|\|\||&&)\s*["'`]([^"'`${}]+)["'`]/g)) add(match[1] ?? "");
  return [...found];
}

function loadAllowedCopy(): Set<string> {
  const root = sourceRoots.find(existsSync);
  if (!root) return new Set();
  return new Set(sourceFiles(root).flatMap((file) => extractInterfaceCopy(readFileSync(file, "utf8"))));
}

const allowedInterfaceCopy = loadAllowedCopy();

export function allowedInterfaceStrings(values: unknown[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = normalizeInterfaceCopy(value);
    if (allowedInterfaceCopy.has(normalized)) unique.add(normalized);
  }
  return [...unique];
}