import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Path, Svg } from 'react-native-svg';
import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { type Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CosmicBackground } from '@/components/cosmic-background';
import { useColors } from '@/hooks/useColors';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'sign-up' | 'sign-in';

function messageFrom(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as { message?: string; longMessage?: string; errors?: Array<{ code?: string; longMessage?: string; message?: string }> };
  if (candidate.errors?.some((item) => item.code === 'form_identifier_exists')) return 'An account with this email already exists. Sign in instead.';
  return candidate.errors?.[0]?.longMessage ?? candidate.errors?.[0]?.message ?? candidate.longMessage ?? candidate.message ?? fallback;
}

function useWarmBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export function AuthScreen({ mode, allowSignedInPreview = false }: { mode: Mode; allowSignedInPreview?: boolean }) {
  return mode === 'sign-up' ? <SignUpScreen allowSignedInPreview={allowSignedInPreview} /> : <SignInScreen />;
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.authBackground }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CosmicBackground />
      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 24, paddingHorizontal: 16 }]}>
        <Pressable onPress={() => router.replace('/' as Href)} style={styles.backButton} accessibilityRole="button">
          <Feather name="arrow-left" size={16} color={colors.authMuted} />
          <Text style={[styles.backText, { color: colors.authMuted }]}>Back to Base</Text>
        </Pressable>
      </View>
      <Image
        source={require('@/assets/images/blasterr-mobile-logo.png')}
        style={[styles.logo, { top: insets.top + 164 }]}
        contentFit="contain"
        accessibilityLabel="BLASTERR"
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 190, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.authCard, borderColor: colors.authBorder }]}>
          <Text style={[styles.title, { color: colors.authForeground }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.authMuted }]}>{subtitle}</Text>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SignUpScreen({ allowSignedInPreview }: { allowSignedInPreview: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState(false);
  const [error, setError] = useState('');
  const busy = fetchStatus === 'fetching';
  useWarmBrowser();

  useEffect(() => {
    if (!allowSignedInPreview && isSignedIn && signUp.status !== 'complete') router.replace('/settings?onboarding=1');
  }, [allowSignedInPreview, isSignedIn, router, signUp.status]);

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
      <AuthShell title="Verify Your Account" subtitle={`Enter the code sent to ${email.trim()}.`}>
        <LabeledInput label="Verification code" value={code} onChangeText={setCode} placeholder="Enter your verification code" keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
        <ErrorMessage message={error} colors={colors} />
        <PrimaryButton label="Verify and continue" busyLabel="Verifying…" busy={busy} disabled={!code.trim()} onPress={() => { void verify(); }} colors={colors} />
        <Pressable onPress={() => { setVerification(false); setCode(''); setError(''); }} style={styles.textButton} accessibilityRole="button">
          <Text style={[styles.textLink, { color: colors.primary }]}>Use a different email</Text>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Request Clearance" subtitle="Join the network and start blasting.">
      <GoogleButton busy={busy} onPress={() => { void google(); }} colors={colors} />
      <Divider colors={colors} />
      <LabeledInput label="Email address" value={email} onChangeText={setEmail} placeholder="Enter your email address" autoCapitalize="none" keyboardType="email-address" autoComplete="email" colors={colors} />
      <PasswordInput label="Password" value={password} onChangeText={setPassword} placeholder="Use 7 or more characters" autoComplete="new-password" showPassword={showPassword} onToggle={() => setShowPassword((visible) => !visible)} colors={colors} />
      <ErrorMessage message={error} colors={colors} />
      <PrimaryButton label="Continue" busyLabel="Creating account…" busy={busy} disabled={!email.trim() || password.length < 7} onPress={() => { void createAccount(); }} colors={colors} />
      <View style={styles.switchRow}><Text style={[styles.switchCopy, { color: colors.authMuted }]}>Already have an account?</Text><Pressable onPress={() => router.replace('/sign-in' as Href)}><Text style={[styles.textLink, { color: colors.primary }]}>Sign in</Text></Pressable></View>
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
  const [showPassword, setShowPassword] = useState(false);
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
      <AuthShell title="Start Blasting" subtitle="Enter the security code sent to your email.">
        <LabeledInput label="Security code" value={code} onChangeText={setCode} placeholder="Enter your security code" keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
        <ErrorMessage message={error} colors={colors} />
        <PrimaryButton label="Verify and sign in" busyLabel="Signing in…" busy={busy} disabled={!code.trim()} onPress={() => { void verify(); }} colors={colors} />
        <Pressable onPress={() => { signIn.reset(); setNeedsCode(false); }} style={styles.textButton}><Text style={[styles.textLink, { color: colors.primary }]}>Start over</Text></Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Start Blasting" subtitle="Enter credentials to resume your session.">
      <GoogleButton busy={busy} onPress={() => { void google(); }} colors={colors} />
      <Divider colors={colors} />
      <LabeledInput label="Email address" value={email} onChangeText={setEmail} placeholder="Enter your email address" autoCapitalize="none" keyboardType="email-address" autoComplete="email" colors={colors} />
      <PasswordInput label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" autoComplete="current-password" showPassword={showPassword} onToggle={() => setShowPassword((visible) => !visible)} colors={colors} />
      <ErrorMessage message={error} colors={colors} />
      <PrimaryButton label="Sign in" busyLabel="Signing in…" busy={busy} disabled={!email.trim() || !password} onPress={() => { void submit(); }} colors={colors} />
      <View style={styles.switchRow}><Text style={[styles.switchCopy, { color: colors.authMuted }]}>Don&apos;t have an account?</Text><Pressable onPress={() => router.replace('/sign-up' as Href)}><Text style={[styles.textLink, { color: colors.primary }]}>Sign up</Text></Pressable></View>
    </AuthShell>
  );
}

function LabeledInput({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={[styles.label, { color: colors.authForeground }]}>{label}</Text><TextInput {...props} placeholderTextColor={colors.authMuted} style={[styles.input, { color: colors.authForeground, borderColor: colors.authBorder, backgroundColor: colors.authInput }]} /></View>;
}

function PasswordInput({ label, value, onChangeText, placeholder, autoComplete, showPassword, onToggle, colors }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; autoComplete?: 'current-password' | 'new-password'; showPassword: boolean; onToggle: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.authForeground }]}>{label}</Text>
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.authMuted}
          autoComplete={autoComplete}
          secureTextEntry={!showPassword}
          style={[styles.input, styles.passwordInput, { color: colors.authForeground, borderColor: colors.authBorder, backgroundColor: colors.authInput }]}
        />
        <Pressable onPress={onToggle} style={styles.passwordToggle} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
          <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.authMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function GoogleMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" accessibilityLabel="Google">
      <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.45a5.51 5.51 0 0 1-2.39 3.62v3.01h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.07.72-2.43 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <Path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.93.46 3.75 1.28 5.38l4-3.1Z" />
      <Path fill="#EA4335" d="M12 4.77c1.77 0 3.36.61 4.6 1.81l3.45-3.45C17.95 1.12 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1c.95-2.84 3.6-4.95 6.72-4.95Z" />
    </Svg>
  );
}

function GoogleButton({ busy, onPress, colors }: { busy: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.google, { borderColor: colors.authBorder, opacity: busy ? 0.6 : pressed ? 0.75 : 1 }]} accessibilityRole="button">
      {busy ? <ActivityIndicator color={colors.authForeground} /> : <View style={styles.googleContent}><GoogleMark /><Text style={[styles.googleText, { color: colors.authForeground }]}>Continue with Google</Text></View>}
    </Pressable>
  );
}

function PrimaryButton({ label, busyLabel, busy, disabled, onPress, colors }: { label: string; busyLabel: string; busy: boolean; disabled: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} disabled={busy || disabled} style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: busy ? 0.45 : pressed ? 0.9 : 1 }]} accessibilityRole="button"><Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{busy ? busyLabel : label}</Text></Pressable>;
}

function ErrorMessage({ message, colors }: { message: string; colors: ReturnType<typeof useColors> }) {
  return message ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.destructive }]}>{message}</Text> : null;
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={styles.divider}><View style={[styles.line, { backgroundColor: colors.authBorder }]} /><Text style={[styles.or, { color: colors.authMuted }]}>or</Text><View style={[styles.line, { backgroundColor: colors.authBorder }]} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, alignItems: 'flex-end' },
  backButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  backText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 12 },
  logo: { position: 'absolute', zIndex: 1, width: 220, height: 74, alignSelf: 'center' },
  card: { width: '100%', maxWidth: 448, alignSelf: 'center', borderRadius: 24, borderWidth: 1, padding: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 29, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 12 },
  field: { marginBottom: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 15, marginBottom: 6 },
  input: { height: 36, borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  passwordInput: { paddingRight: 44 },
  passwordToggle: { position: 'absolute', top: 0, right: 8, height: 36, width: 30, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  primary: { height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  line: { height: StyleSheet.hairlineWidth, flex: 1 },
  or: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  google: { height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  googleText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12 },
  switchCopy: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  textButton: { alignItems: 'center', paddingVertical: 12 },
  textLink: { fontFamily: 'Inter_500Medium', fontSize: 12 },
});