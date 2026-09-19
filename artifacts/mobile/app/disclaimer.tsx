import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

const sections = [
  {
    heading: 'BLASTERR DISCLAIMER',
    paragraphs: [
      'Violence, Threats & Use of the BLASTERR Name',
      'BLASTERR is a social media and public discussion platform created to facilitate conversation, commentary, opinions, information sharing, entertainment, and the exchange of ideas.',
      'The name BLASTERR, as well as terms including “Blast,” “Put It on Blast,” “Blasted,” and similar terminology used throughout the platform, are intended solely as references to online discussion, commentary, attention, or public conversation.',
    ],
  },
  {
    heading: 'BLASTERR DOES NOT CONDONE VIOLENCE',
    paragraphs: [
      'BLASTERR does not condone, encourage, promote, support, or endorse violence, physical harm, threats of violence, intimidation, harassment, assault, or any unlawful conduct against any person, business, organization, animal, or property.',
      'The use of the words “Blast” or “Blasterr” on the platform does not refer to shooting, attacking, harming, or physically targeting another person or property.',
      'BLASTERR is not a weapons platform, and “Blasterr” does not mean or instruct anyone to use a real weapon, firearm, explosive, or other weapon against another person.',
      'Any references to “putting someone on Blast” are strictly intended to mean bringing attention to a person, place, business, topic, event, opinion, experience, or issue through online discussion.',
    ],
  },
  {
    heading: 'THREATS AND VIOLENT CONTENT',
    paragraphs: [
      'BLASTERR does not authorize the use of its platform to make credible threats, encourage violence, coordinate violent activity, glorify acts of violence, or encourage users to harm another person or property.',
      "Content that violates applicable law or BLASTERR's Community Guidelines may be removed, restricted, reported to appropriate authorities when warranted, and/or result in suspension or termination of the responsible account.",
      'Users should never interpret content posted on BLASTERR as permission, encouragement, or instruction to engage in violence or unlawful activity.',
    ],
  },
  {
    heading: 'RESPONSIBLE USE',
    paragraphs: [
      'BLASTERR encourages users to use the platform responsibly and to express disagreement through discussion, commentary, evidence, opinions, and lawful communication — not violence or physical confrontation.',
      "Users are responsible for their own conduct and for complying with applicable laws and BLASTERR's Terms of Service and Community Guidelines.",
      'If you believe you or someone else is in immediate danger, contact the appropriate emergency services or law-enforcement authority in your area.',
      'BLASTERR is about putting conversations, opinions, experiences, and issues ON BLAST — not putting people in physical danger.',
      'BLASTERR™ — SAY IT. SHARE IT. PUT IT ON BLAST.',
    ],
  },
];

export default function DisclaimerScreen() {
  const colors = useColors();
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Link href="/home" style={[styles.back, { color: colors.primary }]}>Back to Home</Link>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>BLASTERR legal</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Disclaimer</Text>
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>Last updated: August 29, 2026</Text>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.paragraph, { color: colors.mutedForeground }]}>{paragraph}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  back: { fontSize: 15, fontWeight: '700', marginBottom: 28 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '900', marginBottom: 8 },
  updated: { fontSize: 13, marginBottom: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 20 },
  section: { marginBottom: 28 },
  heading: { fontSize: 21, fontWeight: '800', marginBottom: 10 },
  paragraph: { fontSize: 16, lineHeight: 25, marginBottom: 10 },
});