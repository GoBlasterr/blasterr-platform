import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

type LegalPageProps = {
  kind: "privacy" | "terms" | "disclaimer";
};

const privacySections: LegalSection[] = [
  {
    heading: "1. Overview",
    paragraphs: [
      "This Privacy Policy explains how BLASTERR collects, uses, shares, and protects information when you use the BLASTERR website, applications, and related services (collectively, the “Service”). BLASTERR is a Target-centric social platform where people can publish Blasts about people, businesses, places, products, events, ideas, and other Targets.",
      "By using the Service, you acknowledge the practices described here. If you do not agree with this policy, please do not use the Service.",
    ],
  },
  {
    heading: "2. Information We Collect",
    paragraphs: ["The information we collect depends on how you use BLASTERR and may include:"],
    bullets: [
      "Account information, such as your name, username, email address, profile photo, biography, and location that you choose to provide.",
      "Content and activity, including Blasts, comments, reactions, Blast Backs, bookmarks, follows, reports, and moderation requests.",
      "Device and usage information, such as browser type, device identifiers, approximate location, pages viewed, and interaction timestamps.",
      "Information you send to us when you contact support, report content, or otherwise communicate with BLASTERR.",
      "Location information only when you choose to enable a location-based feature. You can control location access through your device or browser settings.",
    ],
  },
  {
    heading: "3. How We Use Information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Provide, personalize, maintain, and improve the Service, including feeds, Target discovery, search, notifications, and nearby features.",
      "Authenticate accounts, protect the Service, prevent abuse, investigate violations, and enforce our Terms and Community Standards.",
      "Show content, recommendations, and notifications that are relevant to your activity and settings.",
      "Respond to support requests, communicate service updates, and send messages you have requested or permitted.",
      "Understand product usage, troubleshoot issues, and develop new features using aggregated or de-identified information where practical.",
    ],
  },
  {
    heading: "4. How Information Is Shared",
    paragraphs: [
      "BLASTERR is a social platform. Information you make public—such as your public profile, Targets, Blasts, comments, reactions, and other public activity—may be viewed, shared, or indexed by other people.",
      "We may share information with service providers that help us operate the Service, such as hosting, authentication, storage, analytics, security, and customer-support providers. These providers may use information only to perform services for us.",
      "We may also disclose information when required by law, to protect the rights and safety of users or BLASTERR, to investigate fraud or abuse, or as part of a merger, acquisition, financing, or sale of assets. We do not sell personal information for money.",
    ],
  },
  {
    heading: "5. Your Controls and Choices",
    paragraphs: [
      "You can review and update certain profile information in Settings. You can control notification preferences, remove bookmarks, change location permissions, and choose what you publish publicly.",
      "Depending on where you live, you may have rights to request access to, correction of, deletion of, or a copy of your personal information. You may also have the right to object to or restrict certain processing. To make a request, contact us using the legal contact listed below. We may need to verify your identity before completing a request.",
    ],
  },
  {
    heading: "6. Retention and Account Deletion",
    paragraphs: [
      "We retain information for as long as needed to provide the Service, meet legal and security obligations, resolve disputes, and enforce agreements. Retention periods vary based on the type of information and how it is used.",
      "When you request account deletion, we will take reasonable steps to delete or de-identify information associated with your account, subject to information we must retain for legal, security, fraud-prevention, or recordkeeping purposes. Public content may remain in quoted, aggregated, or legally retained records.",
    ],
  },
  {
    heading: "7. Cookies and Similar Technologies",
    paragraphs: [
      "BLASTERR and our service providers may use cookies, local storage, and similar technologies to keep you signed in, remember preferences, protect accounts, understand usage, and improve performance. You can manage cookies through your browser, but disabling necessary technologies may affect parts of the Service.",
    ],
  },
  {
    heading: "8. Security",
    paragraphs: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. No online service can guarantee absolute security, so please use a strong password, protect your account credentials, and notify us promptly if you believe your account has been compromised.",
    ],
  },
  {
    heading: "9. Children’s Privacy",
    paragraphs: [
      "The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to BLASTERR, please contact us so we can take appropriate action.",
    ],
  },
  {
    heading: "10. Changes and Contact",
    paragraphs: [
      "We may update this Privacy Policy as the Service changes. When we make material changes, we will provide notice through the Service or another appropriate channel. The “Last updated” date below shows when this policy was most recently revised.",
      "Questions or privacy requests can be sent to legal@blasterr.com.",
    ],
  },
];

const termsSections: LegalSection[] = [
  {
    heading: "1. Agreement to These Terms",
    paragraphs: [
      "These Terms and Conditions (“Terms”) govern your access to and use of the BLASTERR website, applications, and related services (collectively, the “Service”). By creating an account or using the Service, you agree to these Terms and our Privacy Policy.",
      "If you do not agree to these Terms, you may not access or use BLASTERR.",
    ],
  },
  {
    heading: "2. Eligibility and Accounts",
    paragraphs: [
      "You must be legally able to enter into these Terms to use BLASTERR. You are responsible for providing accurate account information, keeping your credentials secure, and all activity that occurs through your account.",
      "Do not impersonate another person or create an account for someone else without permission. Notify BLASTERR promptly if you believe your account has been accessed without authorization.",
    ],
  },
  {
    heading: "3. The BLASTERR Service",
    paragraphs: [
      "BLASTERR provides tools for discovering Targets and publishing, discussing, reacting to, and sharing user-generated content. Features may change, be suspended, or be discontinued as we improve the Service or respond to safety, legal, or operational needs.",
      "BLASTERR does not endorse, verify, or guarantee the accuracy, legality, safety, or quality of any Target or user content. A Blast is an opinion or contribution from its author unless BLASTERR clearly states otherwise.",
    ],
  },
  {
    heading: "4. Your Content",
    paragraphs: [
      "You retain ownership of content you submit to BLASTERR, including Blasts, comments, profile information, images, and other materials (“User Content”). You grant BLASTERR a worldwide, non-exclusive, royalty-free license to host, store, reproduce, format, display, distribute, and transmit your User Content as needed to operate, promote, and improve the Service.",
      "You represent that you have the rights and permissions needed to submit your User Content and that it does not violate these Terms, applicable law, or another person’s rights. Do not post private information about another person without a lawful basis and appropriate permission.",
    ],
  },
  {
    heading: "5. Acceptable Use",
    paragraphs: ["You may not use BLASTERR to:"],
    bullets: [
      "Threaten, harass, stalk, exploit, or encourage violence against another person or group.",
      "Publish illegal, fraudulent, defamatory, hateful, sexually exploitative, or intentionally deceptive content.",
      "Infringe copyrights, trademarks, privacy rights, publicity rights, or other intellectual-property rights.",
      "Target people with spam, scams, malware, phishing, coordinated manipulation, or unauthorized advertising.",
      "Attempt to access another account, disrupt the Service, scrape data at scale, bypass security controls, or use automated systems without written permission.",
      "Create misleading Targets or manipulate reactions, engagement, rankings, or recommendations.",
    ],
  },
  {
    heading: "6. Moderation and Enforcement",
    paragraphs: [
      "We may review, label, restrict, remove, or preserve User Content and may warn, suspend, or terminate accounts when we believe they violate these Terms, our Community Standards, or applicable law. We may also act to protect users, investigate abuse, or comply with legal requests.",
      "You can report content or accounts through available in-product reporting tools. We may provide an appeal or review process where appropriate, but we cannot guarantee that every report or appeal will result in a particular outcome.",
    ],
  },
  {
    heading: "7. Interactions and Third-Party Content",
    paragraphs: [
      "You are responsible for your interactions with other users and Targets. BLASTERR is not responsible for disputes, transactions, claims, or harm arising from interactions between users.",
      "The Service may link to or integrate with third-party services. Those services have their own terms and privacy policies, and BLASTERR is not responsible for their content, availability, or practices.",
    ],
  },
  {
    heading: "8. Intellectual Property",
    paragraphs: [
      "BLASTERR and its original software, branding, designs, logos, interfaces, and other materials are owned by BLASTERR or its licensors and are protected by applicable law. Except as expressly allowed by these Terms, you may not copy, modify, distribute, sell, reverse engineer, or create derivative works from those materials.",
    ],
  },
  {
    heading: "9. Disclaimers",
    paragraphs: [
      "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, BLASTERR DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AVAILABILITY, SECURITY, AND ACCURACY. WE DO NOT PROMISE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL CONTENT.",
    ],
  },
  {
    heading: "10. Limitation of Liability",
    paragraphs: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, BLASTERR AND ITS AFFILIATES, OFFICERS, EMPLOYEES, CONTRACTORS, AND LICENSORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, GOODWILL, OR REVENUE ARISING FROM OR RELATED TO THE SERVICE OR THESE TERMS.",
      "Some jurisdictions do not allow certain limitations, so some of the above may not apply to you. In those jurisdictions, liability is limited to the fullest extent permitted by law.",
    ],
  },
  {
    heading: "11. Indemnification",
    paragraphs: [
      "To the extent permitted by law, you agree to defend, indemnify, and hold harmless BLASTERR and its affiliates, officers, employees, contractors, and licensors from claims, damages, liabilities, costs, and expenses arising from your User Content, your use of the Service, your violation of these Terms, or your violation of another person’s rights.",
    ],
  },
  {
    heading: "12. Termination and Changes",
    paragraphs: [
      "You may stop using BLASTERR at any time. We may suspend or terminate access, remove content, or discontinue the Service as permitted by law and these Terms. Provisions that by their nature should survive termination—including ownership, licenses, disclaimers, limitations of liability, and indemnification—will survive.",
      "We may update these Terms from time to time. If changes are material, we will provide notice through the Service or another appropriate channel. Continued use after the effective date means you accept the updated Terms.",
    ],
  },
  {
    heading: "13. Contact",
    paragraphs: [
      "Questions about these Terms can be sent to legal@blasterr.com.",
    ],
  },
];

const disclaimerSections: LegalSection[] = [
  {
    heading: "BLASTERR DISCLAIMER",
    paragraphs: [
      "Violence, Threats & Use of the BLASTERR Name",
      "BLASTERR is a social media and public discussion platform created to facilitate conversation, commentary, opinions, information sharing, entertainment, and the exchange of ideas.",
      "The name BLASTERR, as well as terms including “Blast,” “Put It on Blast,” “Blasted,” and similar terminology used throughout the platform, are intended solely as references to online discussion, commentary, attention, or public conversation.",
    ],
  },
  {
    heading: "BLASTERR DOES NOT CONDONE VIOLENCE",
    paragraphs: [
      "BLASTERR does not condone, encourage, promote, support, or endorse violence, physical harm, threats of violence, intimidation, harassment, assault, or any unlawful conduct against any person, business, organization, animal, or property.",
      "The use of the words “Blast” or “Blasterr” on the platform does not refer to shooting, attacking, harming, or physically targeting another person or property.",
      "BLASTERR is not a weapons platform, and “Blasterr” does not mean or instruct anyone to use a real weapon, firearm, explosive, or other weapon against another person.",
      "Any references to “putting someone on Blast” are strictly intended to mean bringing attention to a person, place, business, topic, event, opinion, experience, or issue through online discussion.",
    ],
  },
  {
    heading: "THREATS AND VIOLENT CONTENT",
    paragraphs: [
      "BLASTERR does not authorize the use of its platform to make credible threats, encourage violence, coordinate violent activity, glorify acts of violence, or encourage users to harm another person or property.",
      "Content that violates applicable law or BLASTERR's Community Guidelines may be removed, restricted, reported to appropriate authorities when warranted, and/or result in suspension or termination of the responsible account.",
      "Users should never interpret content posted on BLASTERR as permission, encouragement, or instruction to engage in violence or unlawful activity.",
    ],
  },
  {
    heading: "RESPONSIBLE USE",
    paragraphs: [
      "BLASTERR encourages users to use the platform responsibly and to express disagreement through discussion, commentary, evidence, opinions, and lawful communication — not violence or physical confrontation.",
      "Users are responsible for their own conduct and for complying with applicable laws and BLASTERR's Terms of Service and Community Guidelines.",
      "If you believe you or someone else is in immediate danger, contact the appropriate emergency services or law-enforcement authority in your area.",
      "BLASTERR is about putting conversations, opinions, experiences, and issues ON BLAST — not putting people in physical danger.",
      "BLASTERR™ — SAY IT. SHARE IT. PUT IT ON BLAST.",
    ],
  },
];

function setMetaDescription(description: string) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", description);
}

function LegalPage({ kind }: LegalPageProps) {
  const isPrivacy = kind === "privacy";
  const isDisclaimer = kind === "disclaimer";
  const title = isPrivacy ? "Privacy Policy" : isDisclaimer ? "Disclaimer" : "Terms and Conditions";
  const description = isPrivacy
    ? "Read the BLASTERR Privacy Policy to understand how we collect, use, share, and protect information on the Target-centric social platform."
    : isDisclaimer
      ? "Read the BLASTERR disclaimer about violence, threats, and responsible use of the BLASTERR name."
      : "Read the BLASTERR Terms and Conditions covering accounts, user content, acceptable use, moderation, and use of the Service.";
  const sections = isPrivacy ? privacySections : isDisclaimer ? disclaimerSections : termsSections;

  useEffect(() => {
    const previousTitle = document.title;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = `${title} | BLASTERR`;
    setMetaDescription(description);
    return () => {
      document.title = previousTitle;
    };
  }, [description, title]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(229,244,3,0.08),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(78,220,255,0.06),transparent_35%)]" />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" className="transition-opacity hover:opacity-80" aria-label="Return to BLASTERR home">
            <img src="/word-logo.png" alt="BLASTERR" className="h-10 w-auto sm:h-12" />
          </Link>
          <Link
            href="/home"
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pb-12 pt-7 sm:px-10 sm:pb-16 sm:pt-9">
        <div className="mb-10 flex items-start gap-4">
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            {isPrivacy ? <ShieldCheck className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.18em] text-primary">
              BLASTERR legal
            </p>
            <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: August 29, 2026</p>
          </div>
        </div>

        <article className="space-y-10 rounded-3xl border border-white/10 bg-card/60 p-6 shadow-[0_4px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-10">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-white">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc space-y-2 pl-5 leading-7 text-muted-foreground marker:text-primary">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>

      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-sm text-muted-foreground">
        <p className="mb-3">© {new Date().getFullYear()} BLASTERR Universe. All systems operational.</p>
        <nav aria-label="Legal navigation" className="flex justify-center gap-5">
          <Link href="/privacy" className={`transition-colors hover:text-primary ${isPrivacy ? "text-primary" : ""}`}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={`transition-colors hover:text-primary ${kind === "terms" ? "text-primary" : ""}`}>
            Terms and Conditions
          </Link>
          <Link href="/disclaimer" className={`transition-colors hover:text-primary ${isDisclaimer ? "text-primary" : ""}`}>
            Disclaimer
          </Link>
        </nav>
      </footer>
    </main>
  );
}

export function PrivacyPolicy() {
  return <LegalPage kind="privacy" />;
}

export function TermsAndConditions() {
  return <LegalPage kind="terms" />;
}

export function Disclaimer() {
  return <LegalPage kind="disclaimer" />;
}