import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { apiUrl } from '@/lib/api-url';

export function BrandHeader({ onCreatePress, onAvatarPress, avatarUrl }: { onCreatePress?: () => void; onAvatarPress?: () => void; avatarUrl?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openCreate = onCreatePress ?? (() => router.push('/create'));
  const openProfile = onAvatarPress ?? (() => router.push('/profile'));
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
      <Image source={require('@/assets/images/blasterr-mobile-logo.png')} style={styles.mark} contentFit="contain" />
      <View style={styles.actions}>
        <Pressable onPress={openCreate} accessibilityRole="button" accessibilityLabel="Create Blast" testID="header-create" style={styles.action}>
          <Feather name="plus" size={21} color={colors.foreground} />
        </Pressable>
        <Pressable onPress={openProfile} accessibilityRole="button" accessibilityLabel="Open profile" testID="header-profile" style={styles.action}>
          {avatarUrl ? <Image source={{ uri: apiUrl(avatarUrl) }} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Feather name="user" size={16} color={colors.primary} /></View>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 88, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  mark: { width: 148, height: 49 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});