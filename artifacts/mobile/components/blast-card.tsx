import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useToggleBookmark, useReactToBlast } from '@workspace/api-client-react';
import type { Blast } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

const elapsed = (date: string) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes / 1440)}d`;
};

export function BlastCard({ blast }: { blast: Blast }) {
  const colors = useColors();
  const [bookmarked, setBookmarked] = useState(blast.isBookmarked);
  const [reaction, setReaction] = useState(blast.reactions.currentUserReaction);
  const bookmark = useToggleBookmark({ mutation: { onSuccess: (data) => setBookmarked(data.isBookmarked) } });
  const react = useReactToBlast({ mutation: { onSuccess: (data) => setReaction(data.currentUserReaction) } });
  const sendReaction = () => react.mutate({ id: blast.id, data: { type: reaction === 'blast' ? 'blast' : 'blast' } });
  const share = async () => { try { await Share.share({ message: `${blast.content}\n\nBLASTERR Target: ${blast.target.name}` }); } catch { Alert.alert('Sharing unavailable', 'Try again in a moment.'); } };
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.authorRow}>{blast.author.avatarUrl ? <Image source={{ uri: apiUrl(blast.author.avatarUrl) }} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Feather name="user" size={15} color={colors.primary} /></View>}<View style={styles.authorText}><Text style={[styles.name, { color: colors.foreground }]}>{blast.author.displayName}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>@{blast.author.username} · {elapsed(blast.createdAt)}</Text></View><View style={[styles.typePill, { backgroundColor: colors.accent }]}><Text style={[styles.typeText, { color: colors.accentForeground }]}>{blast.target.type}</Text></View></View>
    <Text style={[styles.content, { color: colors.foreground }]}>{blast.content}</Text>
    <Pressable style={styles.targetRow} accessibilityRole="button"><View style={[styles.targetIcon, { backgroundColor: colors.secondary }]}><Feather name="crosshair" size={15} color={colors.primary} /></View><View><Text style={[styles.targetName, { color: colors.primary }]}>Target: {blast.target.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{blast.location || blast.target.location}</Text></View></Pressable>
    {blast.mediaUrl ? <Image source={{ uri: apiUrl(blast.mediaUrl) }} style={styles.media} contentFit="cover" transition={180} /> : null}
    <View style={[styles.actions, { borderTopColor: colors.border }]}><Pressable onPress={sendReaction} style={styles.action} accessibilityLabel="React to Blast" testID={`react-${blast.id}`}><Feather name="zap" size={18} color={reaction === 'blast' ? colors.primary : colors.mutedForeground} /><Text style={[styles.count, { color: reaction === 'blast' ? colors.primary : colors.mutedForeground }]}>{blast.reactions.blast}</Text></Pressable><Pressable style={styles.action} accessibilityLabel="Comment"><Feather name="message-circle" size={18} color={colors.mutedForeground} /><Text style={[styles.count, { color: colors.mutedForeground }]}>{blast.commentCount}</Text></Pressable><Pressable onPress={share} style={styles.action} accessibilityLabel="Share"><Feather name="send" size={18} color={colors.mutedForeground} /></Pressable><Pressable onPress={() => bookmark.mutate({ id: blast.id })} style={styles.action} accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'} testID={`bookmark-${blast.id}`}><Feather name={bookmarked ? 'bookmark' : 'bookmark'} size={18} color={bookmarked ? colors.primary : colors.mutedForeground} /></Pressable></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  authorText: { flex: 1 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  typePill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5 },
  typeText: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  content: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24, marginTop: 15 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
  targetIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  targetName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  media: { width: '100%', height: 190, borderRadius: 13, marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 15, paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 34 },
  count: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});