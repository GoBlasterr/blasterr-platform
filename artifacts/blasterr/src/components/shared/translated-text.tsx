import { useEffect, useState } from "react";
import {
  useGetViewerLocale,
  useTranslateText,
  type TranslationInputContext,
  type TranslationInputTargetLanguage,
  type ViewerLocaleLanguage,
} from "@workspace/api-client-react";

const labels: Record<ViewerLocaleLanguage, { translate: string; original: string; translating: string }> = {
  en: { translate: "Translate", original: "See Original", translating: "Translating…" },
  fr: { translate: "Traduire", original: "Voir l’original", translating: "Traduction…" },
  es: { translate: "Traducir", original: "Ver original", translating: "Traduciendo…" },
  de: { translate: "Übersetzen", original: "Original anzeigen", translating: "Übersetzung…" },
  pt: { translate: "Traduzir", original: "Ver original", translating: "Traduzindo…" },
  it: { translate: "Traduci", original: "Vedi originale", translating: "Traduzione…" },
  nl: { translate: "Vertalen", original: "Origineel bekijken", translating: "Vertalen…" },
  tr: { translate: "Çevir", original: "Orijinali gör", translating: "Çevriliyor…" },
  ru: { translate: "Перевести", original: "Показать оригинал", translating: "Перевод…" },
  ar: { translate: "ترجمة", original: "عرض الأصل", translating: "جارٍ الترجمة…" },
  zh: { translate: "翻译", original: "查看原文", translating: "翻译中…" },
  ja: { translate: "翻訳", original: "原文を見る", translating: "翻訳中…" },
  ko: { translate: "번역", original: "원문 보기", translating: "번역 중…" },
};

function splitOuterWhitespace(text: string) {
  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  return {
    leading,
    content: text.slice(leading.length, text.length - trailing.length),
    trailing,
  };
}

export function useViewerLocale() {
  const { data: locale } = useGetViewerLocale();

  useEffect(() => {
    if (!locale) return;
    document.documentElement.lang = locale.language;
    document.documentElement.dir = locale.direction;
  }, [locale]);

  return locale;
}

export function TranslatedText({
  text,
  context,
  className,
}: {
  text: string;
  context: TranslationInputContext;
  className?: string;
}) {
  const locale = useViewerLocale();
  const translateMutation = useTranslateText();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const { leading, content, trailing } = splitOuterWhitespace(text);
  const language = locale?.language ?? "en";
  const copy = labels[language];
  const isTranslatable = content.length > 0;

  useEffect(() => {
    setTranslatedText(null);
  }, [text]);

  const handleTranslate = () => {
    if (!isTranslatable || !locale) return;

    translateMutation.mutate(
      {
        data: {
          text: content,
          targetLanguage: locale.language as TranslationInputTargetLanguage,
          context,
        },
      },
      {
        onSuccess: (result) => {
          setTranslatedText(`${leading}${result.translatedText}${trailing}`);
        },
      },
    );
  };

  const isShowingTranslation = translatedText !== null;

  return (
    <>
      <span className={className} style={{ whiteSpace: "pre-wrap" }} data-no-ui-translation>
        {isShowingTranslation ? translatedText : text}
      </span>
      {isTranslatable && (
        <button
          type="button"
          className="ml-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={(event) => {
            event.stopPropagation();
            if (isShowingTranslation) {
              setTranslatedText(null);
            } else {
              handleTranslate();
            }
          }}
          disabled={translateMutation.isPending || !locale}
          data-testid="button-translate-text"
        >
          {isShowingTranslation
            ? copy.original
            : translateMutation.isPending
              ? copy.translating
              : copy.translate}
        </button>
      )}
    </>
  );
}