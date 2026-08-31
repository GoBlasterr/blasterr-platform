import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function BrandHeader({ onAvatarPress, avatarUrl }: { onAvatarPress?: () => void; avatarUrl?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
      <Image source={require('@/assets/images/icon.png')} style={styles.mark} contentFit="contain" />
      <Text style={[styles.wordmark, { color: colors.foreground }]}>BLASTERR</Text>
      <Pressable onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel="Open profile" testID="header-profile">
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" /> : <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Feather name="user" size={16} color={colors.primary} /></View>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 70, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  mark: { width: 28, height: 28 },
  wordmark: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 1.8 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});