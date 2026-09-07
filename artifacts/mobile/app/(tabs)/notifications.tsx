import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGetNotifications } from '@workspace/api-client-react';
import { EmptyState } from '@/components/empty-state';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';
import { TranslatedText } from '@/components/translated-text';

const icons = { follow: 'user-plus', reaction: 'zap', comment: 'message-circle', reply: 'corner-down-right', 'blast-back': 'repeat', mention: 'at-sign', trending: 'trending-up', target: 'crosshair' } as const;
export default function NotificationsScreen() {
  const colors = useColors();
  const notifications = useGetNotifications();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><CosmicBackground /><View style={styles.heading}><Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text></View>{notifications.isLoading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : <FlatList data={notifications.data ?? []} keyExtractor={(item) => item.id} renderItem={({ item }) => <View style={[styles.row, { borderBottomColor: colors.border }]}><View style={[styles.icon, { backgroundColor: item.read ? colors.secondary : colors.accent }]}><Feather name={icons[item.type] ?? 'bell'} size={17} color={item.read ? colors.mutedForeground : colors.primary} /></View><View style={styles.copy}><TranslatedText text={item.message} context="notification" textStyle={styles.message} /><Text style={[styles.time, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>{!item.read ? <View style={[styles.unread, { backgroundColor: colors.primary }]} /> : null}</View>} ListEmptyComponent={<EmptyState icon="bell-off" title="No notifications yet." />} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />}</View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, heading: { padding: 20, paddingTop: 24 }, title: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 4 }, spinner: { marginTop: 50 }, list: { paddingHorizontal: 20 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth }, icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, message: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 }, time: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 }, unread: { width: 7, height: 7, borderRadius: 4 } });