import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useGetViewerLocale, useTranslateText, type TranslationInputContext, type ViewerLocaleLanguage } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const controlLabels: Record<ViewerLocaleLanguage, { translate: string; original: string }> = {
  en: { translate: 'Translate', original: 'See original' },
  fr: { translate: 'Traduire', original: 'Voir l’original' },
  es: { translate: 'Traducir', original: 'Ver original' },
  de: { translate: 'Übersetzen', original: 'Original anzeigen' },
  pt: { translate: 'Traduzir', original: 'Ver original' },
  it: { translate: 'Traduci', original: 'Vedi originale' },
  nl: { translate: 'Vertalen', original: 'Origineel bekijken' },
  tr: { translate: 'Çevir', original: 'Orijinali gör' },
  ru: { translate: 'Перевести', original: 'Показать оригинал' },
  ar: { translate: 'ترجمة', original: 'عرض الأصل' },
  zh: { translate: '翻译', original: '查看原文' },
  ja: { translate: '翻訳', original: '元の文章を見る' },
  ko: { translate: '번역', original: '원문 보기' },
};

type TranslatedTextProps = {
  text: string;
  context: TranslationInputContext;
  textStyle?: StyleProp<TextStyle>;
};

export function TranslatedText({ text, context, textStyle }: TranslatedTextProps) {
  const colors = useColors();
  const locale = useGetViewerLocale();
  const translate = useTranslateText();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [hasError, setHasError] = useState(false);
  const language = locale.data?.language ?? 'en';
  const isRtl = locale.data?.direction === 'rtl';
  const labels = controlLabels[language];

  const onPress = () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translatedText !== null) {
      setShowTranslation(true);
      return;
    }
    if (translate.isPending) return;

    setHasError(false);
    translate.mutate(
      { data: { text, targetLanguage: language, context } },
      {
        onSuccess: (result) => {
          setTranslatedText(result.translatedText);
          setShowTranslation(true);
        },
        onError: () => setHasError(true),
      },
    );
  };

  const isPending = translate.isPending;
  const label = showTranslation ? labels.original : labels.translate;
  return <View>
    <Text style={[styles.text, textStyle, { color: colors.foreground, textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{showTranslation && translatedText !== null ? translatedText : text}</Text>
    <Pressable onPress={onPress} disabled={isPending} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.control, { opacity: pressed || isPending ? 0.55 : 1 }]}>
      {isPending ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : null}
      <Text style={[styles.controlText, { color: hasError ? colors.mutedForeground : colors.primary, textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{hasError && !showTranslation ? `${label} · Try again` : label}</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  text: { fontFamily: 'Inter_400Regular' },
  control: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, minHeight: 24 },
  controlText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});