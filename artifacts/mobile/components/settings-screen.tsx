import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth, useClerk } from '@clerk/expo';
import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentUserQueryKey, useGetCurrentUser, useUpdateCurrentUser } from '@workspace/api-client-react';
import { CosmicBackground } from '@/components/cosmic-background';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

type ImageAsset = { uri: string; name: string; contentType: string; size: number };
type Form = { displayName: string; username: string; bio: string; city: string; state: string; zipCode: string; avatarUrl: string; coverUrl: string };
const emptyForm: Form = { displayName: '', username: '', bio: '', city: '', state: '', zipCode: '', avatarUrl: '', coverUrl: '' };
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const NOTIFICATIONS_KEY = 'blasterr:device-notifications:v1';

async function uploadImage(image: ImageAsset, purpose: 'avatar' | 'banner', token: string) {
  const blob = await (await fetch(image.uri)).blob();
  const request = await fetch(apiUrl('/api/storage/uploads/request-url'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: image.name, size: image.size || blob.size, contentType: image.contentType, purpose }) });
  const details = await request.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
  if (!request.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
  const upload = await fetch(details.uploadURL, { method: 'PUT', headers: { 'Content-Type': image.contentType }, body: blob });
  if (!upload.ok) throw new Error(`Could not upload the ${purpose} image.`);
  const completed = await fetch(apiUrl(`/api/storage/uploads/${details.assetId}/complete`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!completed.ok) throw new Error(`Could not verify the ${purpose} image upload.`);
  return `/api/storage${details.objectPath}`;
}

export default function SettingsScreen() {
  const colors = useColors();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const currentUser = useGetCurrentUser();
  const update = useUpdateCurrentUser();
  const [form, setForm] = useState<Form>(emptyForm);
  const [avatar, setAvatar] = useState<ImageAsset | null>(null);
  const [banner, setBanner] = useState<ImageAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [notifications, setNotifications] = useState(true);
  useEffect(() => { void AsyncStorage.getItem(NOTIFICATIONS_KEY).then((value) => { if (value !== null) setNotifications(value === 'true'); }); }, []);
  useEffect(() => { const user = currentUser.data; if (user) setForm({ displayName: user.displayName, username: user.username, bio: user.bio ?? '', city: user.city ?? '', state: user.state ?? '', zipCode: user.zipCode ?? '', avatarUrl: user.avatarUrl ?? '', coverUrl: user.coverUrl ?? '' }); }, [currentUser.data]);
  const set = (key: keyof Form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const chooseImage = async (purpose: 'avatar' | 'banner') => {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setMessage({ text: 'Allow photo library access to choose an image.', error: true }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const contentType = asset.mimeType ?? 'image/jpeg';
    const size = asset.fileSize ?? 0;
    if (!allowedTypes.includes(contentType)) { setMessage({ text: 'Choose a JPG, PNG, WebP, or GIF image.', error: true }); return; }
    if (size > 10 * 1024 * 1024) { setMessage({ text: 'Images must be 10 MB or smaller.', error: true }); return; }
    const image = { uri: asset.uri, name: asset.fileName ?? `${purpose}-${Date.now()}.jpg`, contentType, size };
    if (purpose === 'avatar') setAvatar(image); else setBanner(image);
  };
  const save = async () => {
    setMessage(null);
    if (!form.displayName.trim()) { setMessage({ text: 'Display name is required.', error: true }); return; }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username.trim())) { setMessage({ text: 'Username must be 3–30 letters, numbers, or underscores.', error: true }); return; }
    if (!form.city.trim() || !form.state.trim()) { setMessage({ text: 'City and state are required.', error: true }); return; }
    if (form.zipCode.trim() && !/^\d{5}(?:-\d{4})?$/.test(form.zipCode.trim())) { setMessage({ text: 'Enter a valid 5-digit ZIP Code or ZIP+4.', error: true }); return; }
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session is not ready. Please sign in again.');
      const [avatarUrl, coverUrl] = await Promise.all([avatar ? uploadImage(avatar, 'avatar', token) : form.avatarUrl, banner ? uploadImage(banner, 'banner', token) : form.coverUrl]);
      const updated = await update.mutateAsync({ data: { displayName: form.displayName.trim(), username: form.username.trim(), bio: form.bio.trim(), city: form.city.trim(), state: form.state.trim(), zipCode: form.zipCode.trim(), avatarUrl, coverUrl, onboardingComplete: onboarding === '1' ? true : undefined } });
      setForm({ displayName: updated.displayName, username: updated.username, bio: updated.bio ?? '', city: updated.city ?? '', state: updated.state ?? '', zipCode: updated.zipCode ?? '', avatarUrl: updated.avatarUrl ?? '', coverUrl: updated.coverUrl ?? '' });
      setAvatar(null); setBanner(null); setMessage({ text: 'Profile saved successfully.', error: false });
      queryClient.setQueryData(getGetCurrentUserQueryKey(), updated);
      await queryClient.invalidateQueries({ predicate: ({ queryKey }) => typeof queryKey[0] === 'string' && (queryKey[0] === '/api/me' || queryKey[0].startsWith('/api/users/')) });
      if (onboarding === '1') {
        if (!userId) throw new Error('Your account session is unavailable.');
        await user?.reload();
        router.replace('/home');
      }
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Profile settings could not be saved.', error: true }); } finally { setSaving(false); }
  };
  if (currentUser.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><CosmicBackground /><ActivityIndicator color={colors.primary} /></View>;
  if (!currentUser.data) return <View style={[styles.center, { backgroundColor: colors.background }]}><CosmicBackground /><Text style={[styles.error, { color: colors.destructive }]}>Unable to load profile settings.</Text></View>;
  const avatarSource = avatar?.uri ?? (form.avatarUrl ? apiUrl(form.avatarUrl) : '');
  const bannerSource = banner?.uri ?? (form.coverUrl ? apiUrl(form.coverUrl) : '');
  return <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><CosmicBackground /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>{onboarding === '1' ? null : <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={[styles.back, { borderColor: colors.border }]}><Feather name="arrow-left" size={18} color={colors.foreground} /></Pressable>}<View><Text style={[styles.title, { color: colors.foreground }]}>{onboarding === '1' ? 'Complete your profile' : 'Settings'}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{onboarding === '1' ? 'Set up how you appear across BLASTERR' : 'Your BLASTERR profile and device preferences'}</Text></View></View>
    <Section title="Profile appearance" colors={colors}><Pressable onPress={() => { void chooseImage('banner'); }} accessibilityLabel="Change profile banner" style={[styles.banner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>{bannerSource ? <Image source={{ uri: bannerSource }} style={styles.bannerImage} contentFit="cover" /> : <Feather name="image" size={24} color={colors.primary} />}<View style={[styles.imageAction, { backgroundColor: colors.background }]}><Feather name="camera" size={15} color={colors.primary} /></View></Pressable><View style={styles.avatarRow}><Pressable onPress={() => { void chooseImage('avatar'); }} accessibilityLabel="Change profile avatar" style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.accent }]}>{avatarSource ? <Image source={{ uri: avatarSource }} style={styles.avatarImage} contentFit="cover" /> : <Feather name="user" size={24} color={colors.primary} />}</Pressable><Text style={[styles.help, { color: colors.mutedForeground }]}>Tap either image to replace it. JPG, PNG, WebP, or GIF; maximum 10 MB.</Text></View></Section>
    <Section title="Profile details" colors={colors}><Field label="Display name" value={form.displayName} onChangeText={(v) => set('displayName', v)} colors={colors} /><Field label="Username" value={form.username} onChangeText={(v) => set('username', v)} autoCapitalize="none" colors={colors} /><Field label="Bio" value={form.bio} onChangeText={(v) => set('bio', v)} multiline maxLength={280} colors={colors} /><View style={styles.split}><View style={styles.splitItem}><Field label="City" value={form.city} onChangeText={(v) => set('city', v)} colors={colors} /></View><View style={styles.splitItem}><Field label="State" value={form.state} onChangeText={(v) => set('state', v)} colors={colors} /></View></View><Field label="ZIP Code (private)" value={form.zipCode} onChangeText={(v) => set('zipCode', v)} keyboardType="number-pad" maxLength={10} colors={colors} /><Text style={[styles.help, { color: colors.mutedForeground }]}>Your ZIP Code is private and is never shown on your public profile.</Text></Section>
    <Section title="App preferences" colors={colors}><View style={styles.preference}><View style={styles.preferenceCopy}><Text style={[styles.preferenceTitle, { color: colors.foreground }]}>Appearance</Text><Text style={[styles.help, { color: colors.mutedForeground }]}>BLASTERR follows your device’s light or dark appearance.</Text></View><Feather name="smartphone" size={18} color={colors.primary} /></View><View style={[styles.preference, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}><View style={styles.preferenceCopy}><Text style={[styles.preferenceTitle, { color: colors.foreground }]}>Notifications</Text><Text style={[styles.help, { color: colors.mutedForeground }]}>Saved on this device. Account-wide delivery preferences are not available yet.</Text></View><Switch value={notifications} onValueChange={(value) => { setNotifications(value); void AsyncStorage.setItem(NOTIFICATIONS_KEY, String(value)); }} trackColor={{ false: colors.border, true: colors.primary }} accessibilityLabel="Device notifications" /></View></Section>
    <Section title="Location" colors={colors}><Text style={[styles.help, { color: colors.mutedForeground }]}>Nearby uses your location only while you scan. Enable or change permission in device settings.</Text><Pressable onPress={() => { void Linking.openSettings(); }} style={[styles.locationButton, { borderColor: colors.border }]}><Feather name="map-pin" size={16} color={colors.primary} /><Text style={[styles.locationButtonText, { color: colors.foreground }]}>Open device settings</Text></Pressable></Section>
    {onboarding === '1' ? null : <Section title="Account" colors={colors}><Text style={[styles.help, { color: colors.mutedForeground }]}>Signing out keeps your profile and Blasts safe in your account.</Text><Pressable onPress={() => { void signOut().then(() => { queryClient.clear(); router.replace('/sign-in' as never); }); }} style={[styles.locationButton, { borderColor: colors.destructive }]} accessibilityRole="button"><Feather name="log-out" size={16} color={colors.destructive} /><Text style={[styles.locationButtonText, { color: colors.destructive }]}>Sign out</Text></Pressable></Section>}
    {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: message.error ? colors.destructive : colors.primary }]}>{message.text}</Text> : null}<Pressable onPress={() => { void save(); }} disabled={saving} style={({ pressed }) => [styles.save, { backgroundColor: colors.primary, opacity: saving ? 0.55 : pressed ? 0.75 : 1 }]} accessibilityRole="button"><Text style={[styles.saveText, { color: colors.primaryForeground }]}>{saving ? 'Saving profile…' : onboarding === '1' ? 'Save profile and continue' : 'Save changes'}</Text>{saving ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="check" size={18} color={colors.primaryForeground} />}</Pressable>
  </ScrollView></KeyboardAvoidingView>;
}
function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) { return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>{children}</View>; }
function Field({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.mutedForeground} style={[styles.input, props.multiline && styles.multiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { padding: 20, paddingBottom: 44 }, header: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 22, marginTop: 4 }, back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontFamily: 'Inter_700Bold', fontSize: 24 }, subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 }, section: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 15 }, sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 14 }, banner: { height: 116, borderRadius: 13, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, bannerImage: { width: '100%', height: '100%' }, imageAction: { position: 'absolute', right: 9, bottom: 9, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 13 }, avatar: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, help: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 }, field: { marginBottom: 13 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 6 }, input: { minHeight: 45, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 }, multiline: { minHeight: 88, paddingTop: 11, textAlignVertical: 'top' }, split: { flexDirection: 'row', gap: 10 }, splitItem: { flex: 1 }, preference: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 }, preferenceCopy: { flex: 1 }, preferenceTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 4 }, locationButton: { minHeight: 42, borderRadius: 21, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }, locationButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 }, message: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center', marginBottom: 14 }, error: { fontFamily: 'Inter_600SemiBold', fontSize: 14 }, save: { minHeight: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, saveText: { fontFamily: 'Inter_700Bold', fontSize: 15 } });