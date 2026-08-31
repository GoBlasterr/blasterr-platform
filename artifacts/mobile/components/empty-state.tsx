import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: { icon?: keyof typeof Feather.glyphMap; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  return <View style={styles.container}><View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={22} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>{message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}{actionLabel && onAction ? <Pressable onPress={onAction} style={({ pressed }) => [styles.action, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.actionText, { color: colors.primaryForeground }]}>{actionLabel}</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 36, gap: 10 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  message: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 290 },
  action: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 99, marginTop: 8 },
  actionText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});