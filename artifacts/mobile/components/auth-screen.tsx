import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { type Href, useRouter } from 'expo-router';
import { CosmicBackground } from '@/components/cosmic-background';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'sign-up' | 'sign-in';

function messageFrom(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as { message?: string; longMessage?: string; errors?: Array<{ longMessage?: string; message?: string }> };
  return candidate.errors?.[0]?.longMessage ?? candidate.errors?.[0]?.message ?? candidate.longMessage ?? candidate.message ?? fallback;
}

function useWarmBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export function AuthScreen({ mode }: { mode: Mode }) {
  return mode === 'sign-up' ? <SignUpScreen /> : <SignInScreen />;
}

function AuthShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CosmicBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/blasterr-mobile-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="BLASTERR" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>WELCOME TO THE SIGNAL</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignUpScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';
  useWarmBrowser();

  useEffect(() => {
    if (isSignedIn && signUp.status !== 'complete') router.replace('/settings?onboarding=1');
  }, [isSignedIn, router, signUp.status]);

  const finish = useCallback(async () => {
    await signUp.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) {
          setError('Finish the required account step before continuing.');
          return;
        }
        if (!session?.user) {
          setError('Your account was created, but the session is not ready yet.');
          return;
        }
        router.replace('/settings?onboarding=1');
      },
    });
  }, [router, signUp]);

  const createAccount = async () => {
    setError('');
    try {
      const { error: createError } = await signUp.password({ emailAddress: email.trim(), password });
      if (createError) { setError(messageFrom(createError, 'Could not create your account.')); return; }
      const { error: verificationError } = await signUp.verifications.sendEmailCode();
      if (verificationError) { setError(messageFrom(verificationError, 'Could not send the verification code.')); return; }
      setVerification(true);
    } catch (caught) {
      setError(messageFrom(caught, 'Could not create your account.'));
    }
  };

  const verify = async () => {
    setError('');
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) { setError(messageFrom(verifyError, 'That verification code is not valid.')); return; }
      if (signUp.status === 'complete') await finish();
      else setError('Your account still needs more information before it can be activated.');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not verify your account.'));
    }
  };

  const google = async () => {
    setError('');
    try {
      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'blasterr', path: 'sign-up' }),
      });
      if (!result.createdSessionId) {
        setError('Google sign-up needs another account step before continuing.');
        return;
      }
      const createdUserId = result.signUp?.createdUserId;
      router.replace(createdUserId ? '/settings?onboarding=1' : '/home');
    } catch (caught) {
      setError(messageFrom(caught, 'Google sign-up could not be completed.'));
    }
  };

  if (verification) {
    return (
      <AuthShell subtitle={`We sent a six-digit code to ${email.trim()}.`}>
        <LabeledInput label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
        <ErrorMessage message={error} colors={colors} />
        <PrimaryButton label="Verify account" busy={busy} disabled={!code.trim()} onPress={() => { void verify(); }} colors={colors} />
        <Pressable onPress={() => { void signUp.verifications.sendEmailCode(); }} style={styles.textButton} accessibilityRole="button">
          <Text style={[styles.textLink, { color: colors.primary }]}>Send a new code</Text>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Join BLASTERR, complete your profile, and start making noise about what matters.">
      <LabeledInput label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" colors={colors} />
      <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" colors={colors} />
      <ErrorMessage message={error} colors={colors} />
      <PrimaryButton label="Create account" busy={busy} disabled={!email.trim() || !password} onPress={() => { void createAccount(); }} colors={colors} />
      <Divider colors={colors} />
      <Pressable onPress={() => { void google(); }} disabled={busy} style={[styles.google, { borderColor: colors.border }]} accessibilityRole="button">
        <Feather name="globe" size={18} color={colors.foreground} />
        <Text style={[styles.googleText, { color: colors.foreground }]}>Continue with Google</Text>
      </Pressable>
      <View style={styles.switchRow}><Text style={[styles.switchCopy, { color: colors.mutedForeground }]}>Already have an account?</Text><Pressable onPress={() => router.replace('/sign-in' as Href)}><Text style={[styles.textLink, { color: colors.primary }]}>Sign in</Text></Pressable></View>
      <View nativeID="clerk-captcha" />
    </AuthShell>
  );
}

function SignInScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';
  useWarmBrowser();

  useEffect(() => {
    if (isSignedIn && signIn.status !== 'complete') router.replace('/home');
  }, [isSignedIn, router, signIn.status]);

  const finalize = useCallback(async () => {
    await signIn.finalize({
      navigate: async ({ session }) => {
        if (session?.currentTask) { setError('Finish the required security step before continuing.'); return; }
        router.replace('/home');
      },
    });
  }, [router, signIn]);

  const submit = async () => {
    setError('');
    try {
      const { error: signInError } = await signIn.password({ emailAddress: email.trim(), password });
      if (signInError) { setError(messageFrom(signInError, 'Could not sign in.')); return; }
      if (signIn.status === 'complete') await finalize();
      else if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        const emailFactor = signIn.supportedSecondFactors.find((factor) => factor.strategy === 'email_code');
        if (!emailFactor) { setError('This account requires a security method not supported in the app yet.'); return; }
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) { setError(messageFrom(sendError, 'Could not send the security code.')); return; }
        setNeedsCode(true);
      } else setError('This account requires another security step before continuing.');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not sign in.'));
    }
  };

  const verify = async () => {
    setError('');
    try {
      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (verifyError) { setError(messageFrom(verifyError, 'That security code is not valid.')); return; }
      if (signIn.status === 'complete') await finalize();
      else setError('The security check is not complete yet.');
    } catch (caught) {
      setError(messageFrom(caught, 'Could not verify your account.'));
    }
  };

  const google = async () => {
    setError('');
    try {
      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'blasterr', path: 'sign-in' }),
      });
      if (!result.createdSessionId) { setError('Google sign-in needs another security step.'); return; }
      const createdUserId = result.signUp?.createdUserId;
      router.replace(createdUserId ? '/settings?onboarding=1' : '/home');
    } catch (caught) {
      setError(messageFrom(caught, 'Google sign-in could not be completed.'));
    }
  };

  if (needsCode) {
    return (
      <AuthShell subtitle="Enter the security code sent to your email.">
        <LabeledInput label="Security code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
        <ErrorMessage message={error} colors={colors} />
        <PrimaryButton label="Verify and sign in" busy={busy} disabled={!code.trim()} onPress={() => { void verify(); }} colors={colors} />
        <Pressable onPress={() => { signIn.reset(); setNeedsCode(false); }} style={styles.textButton}><Text style={[styles.textLink, { color: colors.primary }]}>Start over</Text></Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Sign in to return to your feed, profile, and conversations.">
      <LabeledInput label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" colors={colors} />
      <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" colors={colors} />
      <ErrorMessage message={error} colors={colors} />
      <PrimaryButton label="Sign in" busy={busy} disabled={!email.trim() || !password} onPress={() => { void submit(); }} colors={colors} />
      <Divider colors={colors} />
      <Pressable onPress={() => { void google(); }} disabled={busy} style={[styles.google, { borderColor: colors.border }]} accessibilityRole="button">
        <Feather name="globe" size={18} color={colors.foreground} />
        <Text style={[styles.googleText, { color: colors.foreground }]}>Continue with Google</Text>
      </Pressable>
      <View style={styles.switchRow}><Text style={[styles.switchCopy, { color: colors.mutedForeground }]}>New to BLASTERR?</Text><Pressable onPress={() => router.replace('/sign-up' as Href)}><Text style={[styles.textLink, { color: colors.primary }]}>Create account</Text></Pressable></View>
    </AuthShell>
  );
}

function LabeledInput({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /></View>;
}

function PrimaryButton({ label, busy, disabled, onPress, colors }: { label: string; busy: boolean; disabled: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} disabled={busy || disabled} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy || disabled ? 0.45 : pressed ? 0.75 : 1 }]} accessibilityRole="button"><Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{busy ? 'Connecting…' : label}</Text>{busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="arrow-right" size={18} color={colors.primaryForeground} />}</Pressable>;
}

function ErrorMessage({ message, colors }: { message: string; colors: ReturnType<typeof useColors> }) {
  return message ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.destructive }]}>{message}</Text> : null;
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={styles.divider}><View style={[styles.line, { backgroundColor: colors.border }]} /><Text style={[styles.or, { color: colors.mutedForeground }]}>OR</Text><View style={[styles.line, { backgroundColor: colors.border }]} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 44 },
  logo: { width: 190, height: 62, alignSelf: 'center', marginTop: -18, marginBottom: 22 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 24, borderWidth: 1, padding: 22 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2.2, marginBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 27 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 22 },
  field: { marginBottom: 14 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 7 },
  input: { minHeight: 50, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  error: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18, marginBottom: 13 },
  primary: { minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  line: { height: StyleSheet.hairlineWidth, flex: 1 },
  or: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.2 },
  google: { minHeight: 50, borderRadius: 25, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20 },
  switchCopy: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  textButton: { alignItems: 'center', paddingVertical: 13 },
  textLink: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});