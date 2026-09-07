type PreloadedSubjectInput = {
  name: string; slug: string; type: "person" | "business" | "place" | "product" | "entertainment" | "sports" | "gaming" | "other";
  category: string; aliases?: string[]; status?: "active" | "disabled";
};
const normalizeTargetText = (value: string) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const normalizedAliasesFor = (name: string, aliases: string[] = []) => [...new Set([name, ...aliases].map(normalizeTargetText).filter(Boolean))];

export type ImportRow = { line: number; status: "create" | "existing" | "duplicate" | "invalid"; message?: string; subject?: PreloadedSubjectInput };

function parseCsvLine(line: string): string[] {
  const cells: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') { if (quoted && line[i + 1] === '"') { cell += char; i += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("Unclosed quote");
  cells.push(cell.trim()); return cells;
}
const validTypes = new Set(["person", "business", "place", "product", "entertainment", "sports", "gaming", "other"]);
export function parsePreloadedCsv(csv: string): ImportRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]!).map(x => x.toLowerCase());
  const fields = ["name", "type", "aliases", "slug", "status"];
  if (!fields.every(field => header.includes(field))) return [{ line: 1, status: "invalid", message: "Header must contain name,type,aliases,slug,status." }];
  const index = (field: string) => header.indexOf(field);
  return lines.slice(1).map((line, offset): ImportRow => {
    const lineNumber = offset + 2;
    try {
      const cells = parseCsvLine(line); const name = cells[index("name")] ?? ""; const type = cells[index("type")] ?? "";
      const slug = cells[index("slug")] ?? ""; const status = cells[index("status")] || "active";
      if (!name.trim() || !validTypes.has(type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !["active", "disabled"].includes(status)) {
        return { line: lineNumber, status: "invalid", message: "Valid name, supported type, lowercase slug, and active/disabled status are required." };
      }
      return { line: lineNumber, status: "create", subject: { name, type: type as PreloadedSubjectInput["type"], slug, category: type, aliases: (cells[index("aliases")] ?? "").split("|").map(x => x.trim()).filter(Boolean), status: status as "active" | "disabled" } };
    } catch (error) { return { line: lineNumber, status: "invalid", message: error instanceof Error ? error.message : "Invalid CSV row." }; }
  });
}
export function classifyPreloadedImport(rows: ImportRow[], existingKeys: Set<string>): ImportRow[] {
  const seen = new Set<string>();
  const seenTerms = new Set<string>();
  return rows.map(row => {
    if (!row.subject) return row;
    const key = normalizeTargetText(row.subject.slug).replace(/\s/g, "-");
    if (seen.has(key)) return { ...row, status: "duplicate", message: "Duplicate canonical slug in upload." };
    seen.add(key);
    const terms = normalizedAliasesFor(row.subject.name, row.subject.aliases).map(value => value.replace(/\s/g, "-"));
    if (terms.some(term => seenTerms.has(term))) return { ...row, status: "duplicate", message: "A name or alias is reused in the upload." };
    terms.forEach(term => seenTerms.add(term));
    return existingKeys.has(key) ? { ...row, status: "existing", message: "Canonical subject already exists." } : row;
  });
}