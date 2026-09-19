import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import {
  BusinessProfileInputCategory, getGetBusinessCenterQueryKey, getGetBusinessQueryKey,
  getListOwnedBusinessesQueryKey, useGetBusiness, useGetBusinessCenter, useGetCurrentUser,
  useUpdateBusinessProfile, type BusinessProfileUpdate,
} from '@workspace/api-client-react';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { CosmicBackground } from '@/components/cosmic-background';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

type Asset = { uri: string; name: string; contentType: string; size: number };
type Form = { name: string; location: string; category: BusinessProfileInputCategory; description: string; website: string; email: string; phone: string };
const categories = Object.values(BusinessProfileInputCategory);
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function uploadImage(image: Asset, purpose: 'target-image' | 'banner', token: string) {
  const blob = await (await fetch(image.uri)).blob();
  const request = await fetch(apiUrl('/api/storage/uploads/request-url'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: image.name, size: image.size || blob.size, contentType: image.contentType, purpose }) });
  const details = await request.json() as { uploadURL?: string; objectPath?: string; assetId?: string; error?: string };
  if (!request.ok || !details.uploadURL || !details.objectPath || !details.assetId) throw new Error(details.error || `Could not prepare the ${purpose} upload.`);
  if (!(await fetch(details.uploadURL, { method: 'PUT', headers: { 'Content-Type': image.contentType }, body: blob })).ok) throw new Error(`Could not upload the ${purpose} image.`);
  if (!(await fetch(apiUrl(`/api/storage/uploads/${details.assetId}/complete`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).ok) throw new Error(`Could not verify the ${purpose} image upload.`);
  return `/api/storage${details.objectPath}`;
}

export default function EditBusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const user = useGetCurrentUser();
  const businessQuery = useGetBusiness(slug, { query: { enabled: !!slug, queryKey: getGetBusinessQueryKey(slug) } });
  const centerQuery = useGetBusinessCenter(businessQuery.data?.id ?? '', { query: { enabled: !!businessQuery.data?.id && !!user.data, retry: false, queryKey: [...getGetBusinessCenterQueryKey(businessQuery.data?.id ?? ''), user.data?.id ?? 'guest'] } });
  const update = useUpdateBusinessProfile();
  const [form, setForm] = useState<Form>({ name: '', location: '', category: BusinessProfileInputCategory.Services, description: '', website: '', email: '', phone: '' });
  const [logo, setLogo] = useState<Asset | null>(null);
  const [banner, setBanner] = useState<Asset | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const business = businessQuery.data;
    if (business) setForm({ name: business.name, location: business.location, category: (business.category as BusinessProfileInputCategory) || BusinessProfileInputCategory.Services, description: business.description || '', website: business.website || '', email: business.email || '', phone: business.phone || '' });
  }, [businessQuery.data]);

  const chooseImage = async (purpose: 'avatar' | 'banner') => {
    setMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setMessage({ text: 'Allow photo library access to choose an image.', error: true }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const selected = result.canceled ? undefined : result.assets[0];
    if (!selected) return;
    const contentType = selected.mimeType ?? 'image/jpeg';
    if (!allowedTypes.includes(contentType)) { setMessage({ text: 'Choose a JPG, PNG, WebP, or GIF image.', error: true }); return; }
    if ((selected.fileSize ?? 0) > 10 * 1024 * 1024) { setMessage({ text: 'Images must be 10 MB or smaller.', error: true }); return; }
    const asset = { uri: selected.uri, name: selected.fileName ?? `${purpose}-${Date.now()}.jpg`, contentType, size: selected.fileSize ?? 0 };
    if (purpose === 'avatar') setLogo(asset); else setBanner(asset);
  };

  const save = async () => {
    if (!businessQuery.data || !centerQuery.data) return;
    if (!form.name.trim() || !form.location.trim() || !form.description.trim()) { setMessage({ text: 'Name, location, and description are required.', error: true }); return; }
    setSaving(true); setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session is not ready. Please sign in again.');
      const [imageUrl, bannerImageUrl] = await Promise.all([logo ? uploadImage(logo, 'target-image', token) : businessQuery.data.imageUrl, banner ? uploadImage(banner, 'banner', token) : businessQuery.data.bannerImageUrl]);
      const data: BusinessProfileUpdate = { ...form, name: form.name.trim(), location: form.location.trim(), description: form.description.trim(), website: form.website.trim(), email: form.email.trim(), phone: form.phone.trim(), imageUrl, bannerImageUrl };
      await update.mutateAsync({ targetId: businessQuery.data.id, data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBusinessQueryKey(slug) }),
        queryClient.invalidateQueries({ queryKey: getGetBusinessCenterQueryKey(businessQuery.data.id) }),
        queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() }),
      ]);
      setLogo(null); setBanner(null); setMessage({ text: 'Business profile saved successfully.', error: false });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Business profile could not be saved.', error: true }); } finally { setSaving(false); }
  };

  if (businessQuery.isLoading || centerQuery.isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><CosmicBackground /><ActivityIndicator color={colors.primary} /></View>;
  if (businessQuery.isError || !businessQuery.data || !centerQuery.data || centerQuery.data.membershipRole !== 'owner') return <View style={[styles.center, { backgroundColor: colors.background }]}><CosmicBackground /><Feather name="lock" size={40} color={colors.mutedForeground} /><Text style={[styles.error, { color: colors.foreground }]}>Only the business owner can edit this page.</Text><Pressable onPress={() => router.back()}><Text style={[styles.backText, { color: colors.primary }]}>Go back</Text></Pressable></View>;
  const business = businessQuery.data;
  const logoSource = logo?.uri ?? (business.imageUrl ? apiUrl(business.imageUrl) : '');
  const bannerSource = banner?.uri ?? (business.bannerImageUrl ? apiUrl(business.bannerImageUrl) : '');
  return <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back"><Feather name="arrow-left" size={22} color={colors.foreground} /><Text style={[styles.backText, { color: colors.foreground }]}>Back</Text></Pressable>
    <Text style={[styles.title, { color: colors.foreground }]}>Edit Business Target</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Update the details and public images for {business.name}.</Text>
    <Pressable onPress={() => { void chooseImage('banner'); }} style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="Change business banner">{bannerSource ? <Image source={{ uri: bannerSource }} style={styles.full} contentFit="cover" /> : <Feather name="image" size={25} color={colors.primary} />}</Pressable>
    <View style={styles.logoRow}><Pressable onPress={() => { void chooseImage('avatar'); }} style={[styles.logo, { backgroundColor: colors.card, borderColor: colors.primary }]} accessibilityLabel="Change business logo">{logoSource ? <Image source={{ uri: logoSource }} style={styles.full} contentFit="cover" /> : <Feather name="briefcase" size={26} color={colors.primary} />}</Pressable><Text style={[styles.help, { color: colors.mutedForeground }]}>Tap either image to replace it. JPG, PNG, WebP, or GIF; maximum 10 MB.</Text></View>
    <Input label="Business name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} colors={colors} /><Input label="City or location" value={form.location} onChangeText={(location) => setForm({ ...form, location })} colors={colors} />
    <Text style={[styles.label, { color: colors.foreground }]}>Category</Text><View style={styles.categories}>{categories.map((category) => <Pressable key={category} onPress={() => setForm({ ...form, category })} style={[styles.category, { borderColor: form.category === category ? colors.primary : colors.border, backgroundColor: form.category === category ? colors.accent : colors.card }]}><Text style={{ color: form.category === category ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>{category}</Text></Pressable>)}</View>
    <Input label="About the business" value={form.description} onChangeText={(description) => setForm({ ...form, description })} colors={colors} multiline /><Input label="Website (optional)" value={form.website} onChangeText={(website) => setForm({ ...form, website })} colors={colors} keyboardType="url" /><Input label="Business email (optional)" value={form.email} onChangeText={(email) => setForm({ ...form, email })} colors={colors} keyboardType="email-address" /><Input label="Phone (optional)" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} colors={colors} keyboardType="phone-pad" />
    {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: message.error ? colors.destructive : colors.primary }]}>{message.text}</Text> : null}
    <Pressable onPress={() => { void save(); }} disabled={saving} style={[styles.submit, { backgroundColor: colors.primary, opacity: saving ? 0.55 : 1 }]}><Text style={[styles.submitText, { color: colors.primaryForeground }]}>{saving ? 'Saving…' : 'Save changes'}</Text>{saving ? <ActivityIndicator color={colors.primaryForeground} /> : null}</Pressable>
  </KeyboardAwareScrollViewCompat>;
}

function Input({ label, colors, multiline, ...props }: { label: string; colors: ReturnType<typeof useColors>; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput {...props} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} placeholderTextColor={colors.mutedForeground} style={[styles.input, multiline && styles.multiline, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} /></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, paddingBottom: 50 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25 }, backText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 }, title: { fontFamily: 'Inter_700Bold', fontSize: 28 }, subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 }, banner: { height: 116, borderRadius: 14, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, full: { width: '100%', height: '100%' }, logoRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginVertical: 14 }, logo: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, help: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 }, field: { marginBottom: 17 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 8 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 }, multiline: { minHeight: 105, paddingTop: 13 }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }, category: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, message: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 13 }, submit: { minHeight: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, submitText: { fontFamily: 'Inter_700Bold', fontSize: 15 }, error: { fontFamily: 'Inter_600SemiBold', fontSize: 15, textAlign: 'center', marginVertical: 16 } });