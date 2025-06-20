import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Lnked',
  description: 'Terms of Service for Lnked platform',
};

export default function TermsPage(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>

        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using Lnked, you accept and agree to be bound by the
          terms and provision of this agreement.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Lnked is a content creation and collaboration platform that allows
          users to create, share, and discover content through posts, videos,
          and collective participation.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account information and for all activities that occur under your
          account.
        </p>

        <h2>4. Content Guidelines</h2>
        <p>
          Users must not post content that is illegal, harmful, threatening,
          abusive, harassing, defamatory, vulgar, obscene, or otherwise
          objectionable.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          Users retain ownership of their content but grant Lnked a license to
          use, display, and distribute such content on the platform.
        </p>

        <h2>6. Privacy</h2>
        <p>
          Your privacy is important to us. Please review our Privacy Policy to
          understand how we collect and use your information.
        </p>

        <h2>7. Termination</h2>
        <p>
          We may terminate or suspend your account at any time for violations of
          these terms or for any other reason at our sole discretion.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          Lnked shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages resulting from your use of the
          service.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. Continued use
          of the service constitutes acceptance of the modified terms.
        </p>

        <h2>10. Contact Information</h2>
        <p>
          If you have any questions about these Terms of Service, please contact
          us through our support channels.
        </p>
      </div>
    </div>
  );
}
