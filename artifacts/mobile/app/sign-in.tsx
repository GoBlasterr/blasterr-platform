import { AuthScreen } from '@/components/auth-screen';
import { Platform } from 'react-native';

export default function SignIn() {
  return (
    <AuthScreen
      mode="sign-in"
      allowSignedInPreview={__DEV__ && Platform.OS === 'web'}
    />
  );
}