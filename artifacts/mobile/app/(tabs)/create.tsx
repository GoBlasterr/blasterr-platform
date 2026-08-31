import { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getListTargetsQueryKey, useCreateBlast, useListTargets } from '@workspace/api-client-react';
import type { Target } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/empty-state';

export default function CreateScreen() {
  const colors = useColors();
  const [content, setContent] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [selected, setSelected] = useState<Target | null>(null);
  const [mediaUri, setMediaUri] = useState('');
  const targetParams = { q: targetQuery };
  const targets = useListTargets(targetParams, { query: { enabled: targetQuery.trim().length > 1, queryKey: getListTargetsQueryKey(targetParams) } });
  const create = useCreateBlast();
  const canPublish = Boolean(selected && content.trim() && !create.isPending);
  const suggestions = useMemo(() => (targets.data ?? []).slice(0, 5), [targets.data]);
  const pickMedia = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) return; const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 }); if (!result.canceled) setMediaUri(result.assets[0]?.uri ?? ''); };
  const publish = () => { if (!selected || !content.trim()) return; create.mutate({ data: { content: content.trim(), targetId: selected.id, mediaUrl: mediaUri || undefined, mediaType: mediaUri ? 'image' : undefined } }); };
  return <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.heading}><Text style={[styles.eyebrow, { color: colors.primary }]}>CREATE</Text><Text style={[styles.title, { color: colors.foreground }]}>Start a Blast</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Put a spotlight on the people, places, and ideas that matter.</Text></View><View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>Lock onto a Target</Text><View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}><Feather name="crosshair" size={17} color={selected ? colors.primary : colors.mutedForeground} /><TextInput value={selected ? selected.name : targetQuery} onChangeText={(value) => { setSelected(null); setTargetQuery(value); }} placeholder="Search for a Target" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} /></View>{selected ? <View style={[styles.selected, { backgroundColor: colors.accent }]}><Feather name="check-circle" size={16} color={colors.primary} /><Text style={[styles.selectedText, { color: colors.accentForeground }]}>Locked onto {selected.name}</Text><Pressable onPress={() => setSelected(null)} accessibilityLabel="Change Target"><Feather name="x" size={17} color={colors.accentForeground} /></Pressable></View> : suggestions.map((target) => <Pressable key={target.id} onPress={() => setSelected(target)} style={[styles.suggestion, { borderBottomColor: colors.border }]}><View style={[styles.targetIcon, { backgroundColor: colors.secondary }]}><Feather name="crosshair" size={15} color={colors.primary} /></View><View><Text style={[styles.targetName, { color: colors.foreground }]}>{target.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{target.type} · {target.location}</Text></View></Pressable>)}</View><View style={styles.field}><View style={styles.labelRow}><Text style={[styles.label, { color: colors.foreground }]}>Your take</Text><Text style={[styles.counter, { color: colors.mutedForeground }]}>{content.length}/1000</Text></View><TextInput value={content} onChangeText={setContent} maxLength={1000} multiline placeholder="What’s the word on this Target?" placeholderTextColor={colors.mutedForeground} style={[styles.composer, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} testID="blast-composer" /></View>{mediaUri ? <View style={styles.previewWrap}><Image source={{ uri: mediaUri }} style={styles.preview} /><Pressable onPress={() => setMediaUri('')} style={[styles.removeMedia, { backgroundColor: colors.foreground }]} accessibilityLabel="Remove media"><Feather name="x" size={15} color={colors.background} /></Pressable></View> : <Pressable onPress={pickMedia} style={[styles.mediaButton, { borderColor: colors.border }]}><Feather name="image" size={18} color={colors.primary} /><Text style={[styles.mediaText, { color: colors.foreground }]}>Add photo or video</Text></Pressable>}<Pressable onPress={publish} disabled={!canPublish} style={({ pressed }) => [styles.publish, { backgroundColor: colors.primary, opacity: !canPublish ? 0.35 : pressed ? 0.75 : 1 }]} testID="publish-blast"><Text style={[styles.publishText, { color: colors.primaryForeground }]}>{create.isPending ? 'Publishing…' : 'Publish Blast'}</Text><Feather name="arrow-up-right" size={18} color={colors.primaryForeground} /></Pressable>{create.isError ? <Text style={[styles.error, { color: colors.destructive }]}>Unable to publish right now. Please check your connection and try again.</Text> : null}{create.isSuccess ? <EmptyState icon="check" title="Blast published" message="Your take is live across BLASTERR." /> : null}</ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  heading: { marginBottom: 26 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, marginTop: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 6 },
  field: { marginBottom: 22 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 9 },
  counter: { fontFamily: 'Inter_400Regular', fontSize: 12 },
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