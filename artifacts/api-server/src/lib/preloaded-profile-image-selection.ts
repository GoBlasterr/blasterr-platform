export function selectWikipediaLogoTitle(name: string, titles: string[]) {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const normalizedFileStem = (title: string) => title
    .replace(/^File:/i, "")
    .replace(/\.(?:svg|png|jpe?g|webp|gif)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const logoCandidates = titles.filter(title => /(?:logo|wordmark)/i.test(title) && !/(commons-logo|open access|closed access)/i.test(title));
  const exactEntityImage = titles.find(title => normalizedFileStem(title) === normalizedName && /\.(?:svg|png)$/i.test(title));
  return exactEntityImage
    ?? logoCandidates.find(title => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(`${normalizedName} logo`))
    ?? logoCandidates.find(title => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(normalizedName));
}