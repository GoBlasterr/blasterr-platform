type SupportedLanguage = "en" | "fr" | "es" | "de" | "pt" | "it" | "nl" | "tr" | "ru" | "ar" | "zh" | "ja" | "ko";

const translatableAttributes = ["placeholder", "title", "aria-label", "alt"] as const;
const excludedSelector = "script,style,code,[translate='no'],[data-no-ui-translation]";

function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function storageKey(language: string) {
  return `blasterr_ui_${language}_v1`;
}

function readCache(language: string): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(language)) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(language: string, cache: Record<string, string>) {
  try {
    const entries = Object.entries(cache).slice(-1_000);
    window.localStorage.setItem(storageKey(language), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Localization remains functional when storage is unavailable.
  }
}

function isExcluded(element: Element | null): boolean {
  return Boolean(element?.closest(excludedSelector));
}

export function installInterfaceLocalization(language: string) {
  const supported = new Set(["en", "fr", "es", "de", "pt", "it", "nl", "tr", "ru", "ar", "zh", "ja", "ko"]);
  if (!supported.has(language) || language === "en") return;

  const root = document.getElementById("root");
  if (!root) return;
  root.style.visibility = "hidden";

  const cache = readCache(language);
  const pending = new Map<string, Array<(translation: string) => void>>();
  let flushTimer: number | undefined;
  let revealed = false;

  const reveal = () => {
    if (revealed) return;
    revealed = true;
    root.style.visibility = "";
  };

  const queue = (copy: string, apply: (translation: string) => void) => {
    const normalized = normalizeCopy(copy);
    if (!normalized || normalized.length > 240 || !/\p{L}/u.test(normalized)) return;
    if (cache[normalized]) {
      apply(cache[normalized]);
      return;
    }
    const callbacks = pending.get(normalized) ?? [];
    callbacks.push(apply);
    pending.set(normalized, callbacks);
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(flush, 30);
  };

  const scan = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (isExcluded(parent)) return;
      const original = node.textContent ?? "";
      queue(original, (translation) => {
        const leading = original.match(/^\s*/)?.[0] ?? "";
        const trailing = original.match(/\s*$/)?.[0] ?? "";
        node.textContent = `${leading}${translation}${trailing}`;
      });
      return;
    }
    if (!(node instanceof Element) || isExcluded(node)) return;
    for (const attribute of translatableAttributes) {
      const original = node.getAttribute(attribute);
      if (original) queue(original, (translation) => node.setAttribute(attribute, translation));
    }
    for (const child of node.childNodes) scan(child);
  };

  const flush = async () => {
    const batch = [...pending.keys()].slice(0, 80);
    if (!batch.length) {
      reveal();
      return;
    }
    try {
      const response = await fetch("/api/localization/interface", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strings: batch }),
      });
      if (response.ok) {
        const body = await response.json() as { translations?: Record<string, string> };
        for (const original of batch) {
          const translation = body.translations?.[original];
          if (!translation) continue;
          cache[original] = translation;
          for (const apply of pending.get(original) ?? []) apply(translation);
        }
        writeCache(language, cache);
      }
    } finally {
      for (const original of batch) pending.delete(original);
      if (pending.size) flushTimer = window.setTimeout(flush, 0);
      else reveal();
    }
  };

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) scan(node);
    }
  }).observe(root, { childList: true, subtree: true });

  window.setTimeout(() => scan(root), 0);
  window.setTimeout(reveal, 3_000);
}