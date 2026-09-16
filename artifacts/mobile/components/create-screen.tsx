import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { getGetFeedQueryKey, getListTargetsQueryKey, useCreateBlast, useListTargets } from '@workspace/api-client-react';
import type { Target } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CosmicBackground } from '@/components/cosmic-background';
import { apiUrl } from '@/lib/api-url';

type SelectedMedia = { uri: string; name: string; contentType: string; size: number; kind: 'image' | 'video' };

async function uploadMedia(media: SelectedMedia): Promise<string> {
  const localResponse = await fetch(media.uri);
  const blob = await localResponse.blob();
  const prepare = await fetch(apiUrl('/api/storage/uploads/request-url'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: media.name, size: media.size || blob.size, contentType: media.contentType, purpose: 'blast-media' }),
  });
  const details = await prepare.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
  if (!prepare.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || 'Could not prepare media upload.');
  const upload = await fetch(details.uploadURL, { method: 'PUT', headers: { 'Content-Type': media.contentType }, body: blob });
  if (!upload.ok) throw new Error('Could not upload media.');
  const complete = await fetch(apiUrl(`/api/storage/uploads/${details.assetId}/complete`), { method: 'POST' });
  if (!complete.ok) throw new Error('The uploaded media could not be verified.');
  return `/api/storage${details.objectPath}`;
}

export default function CreateScreen() {
  const params = useLocalSearchParams<{ targetId?: string; targetName?: string; targetType?: string }>();
  const colors = useColors();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [targetQuery, setTargetQuery] = useState(params.targetName || '');
  const [selected, setSelected] = useState<Target | null>(params.targetId ? { id: params.targetId, name: params.targetName || '', type: (params.targetType as any) || 'business', slug: '', location: '', blastCount: 0, imageUrl: '', bannerImageUrl: '', description: '' } : null);
  const [media, setMedia] = useState<SelectedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const targetParams = { q: targetQuery };
  const targets = useListTargets(targetParams, { query: { enabled: targetQuery.trim().length > 1, queryKey: getListTargetsQueryKey(targetParams) } });
  const create = useCreateBlast();
  const canPublish = Boolean(selected && content.trim() && !create.isPending && !uploading);
  const suggestions = useMemo(() => (targets.data ?? []).slice(0, 5), [targets.data]);
  const pickMedia = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return; const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 }); const asset = result.canceled ? undefined : result.assets[0]; if (asset) setMedia({ uri: asset.uri, name: asset.fileName ?? `blast-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`, contentType: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'), size: asset.fileSize ?? 0, kind: asset.type === 'video' ? 'video' : 'image' }); };
  const publish = async () => { if (!selected || !content.trim()) return; setUploading(Boolean(media)); try { const mediaUrl = media ? await uploadMedia(media) : undefined; create.mutate({ data: { content: content.trim(), targetId: selected.id, mediaUrl, mediaType: media?.kind } }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() }); Alert.alert('Blast Created', 'Your Blast is live.'); router.replace('/home'); } }); } finally { setUploading(false); } };
  return <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><CosmicBackground /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.heading}><Text style={[styles.title, { color: colors.foreground }]}>Create Blast</Text></View><View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>Lock Onto Target</Text><View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}><Feather name="crosshair" size={17} color={selected ? colors.primary : colors.mutedForeground} /><TextInput value={selected ? selected.name : targetQuery} onChangeText={(value) => { setSelected(null); setTargetQuery(value); }} placeholder="Enter target designation..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></View>{selected ? <View style={[styles.selected, { backgroundColor: colors.accent }]}><Feather name="check-circle" size={16} color={colors.primary} /><Text style={[styles.selectedText, { color: colors.accentForeground }]}>Target locked on.</Text><Pressable onPress={() => setSelected(null)} accessibilityLabel="Change Target"><Feather name="x" size={17} color={colors.accentForeground} /></Pressable></View> : suggestions.map((target) => <Pressable key={target.id} onPress={() => setSelected(target)} style={[styles.suggestion, { borderBottomColor: colors.border }]}><View style={[styles.targetIcon, { backgroundColor: colors.secondary }]}><Feather name="crosshair" size={15} color={colors.primary} /></View><View><Text style={[styles.targetName, { color: colors.foreground }]}>{target.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{target.type} · {target.location}</Text></View></Pressable>)}</View><View style={styles.field}><TextInput value={content} onChangeText={setContent} maxLength={1000} multiline placeholder="What's your read on this target?" placeholderTextColor={colors.mutedForeground} style={[styles.composer, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} testID="blast-composer" /></View>{media ? <View style={styles.previewWrap}><Image source={{ uri: media.uri }} style={styles.preview} /><Pressable onPress={() => setMedia(null)} style={[styles.removeMedia, { backgroundColor: colors.foreground }]} accessibilityLabel="Remove media"><Feather name="x" size={15} color={colors.background} /></Pressable></View> : <Pressable onPress={pickMedia} style={[styles.mediaButton, { borderColor: colors.border }]}><Feather name="image" size={18} color={colors.primary} /><Text style={[styles.mediaText, { color: colors.foreground }]}>Attach Image or Video</Text></Pressable>}<Pressable onPress={() => { void publish(); }} disabled={!canPublish} style={({ pressed }) => [styles.publish, { backgroundColor: colors.primary, opacity: !canPublish ? 0.35 : pressed ? 0.75 : 1 }]} testID="publish-blast"><Text style={[styles.publishText, { color: colors.primaryForeground }]}>{create.isPending || uploading ? 'Firing Payload...' : 'Fire Blast'}</Text><Feather name="arrow-up-right" size={18} color={colors.primaryForeground} /></Pressable>{create.isError ? <Text style={[styles.error, { color: colors.destructive }]}>Failed to fire Blast</Text> : null}</ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  heading: { marginBottom: 26 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 4 },
  field: { marginBottom: 22 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 9 },
  inputWrap: { minHeight: 50, borderRadius: 15, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 9 },
  selectedText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  targetIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  targetName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  composer: { minHeight: 150, borderRadius: 15, borderWidth: 1, padding: 15, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  mediaButton: { minHeight: 52, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  mediaText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  previewWrap: { position: 'relative', marginBottom: 20 },
  preview: { width: '100%', height: 190, borderRadius: 14 },
  removeMedia: { position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  publish: { minHeight: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  publishText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center', marginTop: 13 },
});