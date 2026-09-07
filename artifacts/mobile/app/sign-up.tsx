import { AuthScreen } from '@/components/auth-screen';
import { Platform } from 'react-native';

export default function SignUp() {
  return (
    <AuthScreen
      mode="sign-up"
      allowSignedInPreview={__DEV__ && Platform.OS === 'web'}
    />
  );
}