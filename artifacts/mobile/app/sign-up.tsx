import { AuthScreen } from '@/components/auth-screen';
import { useLocalSearchParams } from 'expo-router';

export default function SignUp() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();

  return (
    <AuthScreen
      mode="sign-up"
      allowSignedInPreview={__DEV__ && preview === '1'}
    />
  );
}