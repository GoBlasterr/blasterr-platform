import { Platform } from 'react-native';
import { AuthScreen } from '@/components/auth-screen';
import SettingsScreen from '@/components/settings-screen';

export default function Settings() {
  if (__DEV__ && Platform.OS === 'web') {
    return <AuthScreen mode="sign-up" allowSignedInPreview />;
  }

  return <SettingsScreen />;
}