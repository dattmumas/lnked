import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Lnked',
  description: 'Privacy Policy for Lnked platform',
};

export default function PrivacyPage(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>

        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you
          create an account, post content, or contact us for support.
        </p>

        <h3>Personal Information</h3>
        <ul>
          <li>Name and email address</li>
          <li>Username and profile information</li>
          <li>Content you create and share</li>
          <li>Communications with us</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li>Device and browser information</li>
          <li>IP address and location data</li>
          <li>Usage patterns and preferences</li>
          <li>Cookies and similar technologies</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide and improve our services</li>
          <li>Personalize your experience</li>
          <li>Communicate with you</li>
          <li>Ensure platform safety and security</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell your personal information. We may share information in
          limited circumstances:
        </p>
        <ul>
          <li>With your consent</li>
          <li>To comply with legal requirements</li>
          <li>To protect our rights and safety</li>
          <li>With service providers who assist us</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your information
          against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2>5. Your Rights and Choices</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access and update your information</li>
          <li>Delete your account and data</li>
          <li>Control privacy settings</li>
          <li>Opt out of certain communications</li>
        </ul>

        <h2>6. Cookies and Tracking</h2>
        <p>
          We use cookies and similar technologies to enhance your experience,
          analyze usage, and provide personalized content.
        </p>

        <h2>7. Third-Party Services</h2>
        <p>
          Our platform may integrate with third-party services. This privacy
          policy does not cover their practices.
        </p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          Our service is not intended for children under 13. We do not knowingly
          collect personal information from children under 13.
        </p>

        <h2>9. International Users</h2>
        <p>
          If you are accessing our service from outside the United States,
          please be aware that your information may be transferred to and
          processed in the US.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify
          you of any material changes.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          through our support channels.
        </p>
      </div>
    </div>
  );
}
