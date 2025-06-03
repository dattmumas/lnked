import Link from 'next/link';
import './landing-page.css';

export default function LandingPageContent() {
  return (
    <div className="landing-page">
      {/* Main Container */}
      <div className="main-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              <span>L</span>
              <span>n</span>
              <span>k</span>
              <span>e</span>
              <span>d</span>
            </h1>
            <p className="hero-subtitle">
              The platform built for creators who thrive in collaboration.
              Publish, discover, and build alongside collectives&mdash;turning
              your creative networks into something powerful.
            </p>
          </div>
        </section>

        {/* Why Choose Lnked Section */}
        <section className="flow-section">
          <div className="flow-content">
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Collective Growth & Shared Discovery</h3>
                <p>
                  <strong>Grow Faster Together</strong> — Form or join
                  collectives, combining audiences and creativity. Collaboration
                  accelerates discovery, amplifying everyone&apos;s reach.
                </p>
                <p className="mt-4">
                  <strong>Collaborative Discovery</strong> — Algorithms
                  optimized to surface group projects and collective content,
                  making every creator visible and valued.
                </p>
                <p className="mt-4">
                  <strong>Unlock New Opportunities</strong> — With each new
                  collective and creator joining, your potential for
                  collaboration, discovery, and growth expands.
                </p>
              </div>

              <div className="feature-card">
                <h3>Flexibility & Creative Freedom</h3>
                <p>
                  <strong>Create Your Way</strong> — Share your ideas in the
                  format that fits best—blogs, podcasts, video—all seamlessly
                  integrated on one intuitive platform.
                </p>
                <p className="mt-4">
                  <strong>Your Ideas, Your Terms</strong> — Lnked gives you the
                  freedom to customize how your collaborations work, allowing
                  you to build meaningful creative partnerships.
                </p>
                <p className="mt-4">
                  <strong>Own Your Work</strong> — Maintain full ownership and
                  control of your content. Build lasting creative assets that
                  travel with you.
                </p>
              </div>

              <div className="feature-card">
                <h3>Streamlined Collaboration & Transparency</h3>
                <p>
                  <strong>Frictionless Partnerships</strong> — Transparent
                  collaboration agreements streamline creative projects,
                  reducing administrative friction and enhancing trust.
                </p>
                <p className="mt-4">
                  <strong>Clear, Automated Organization</strong> — Built-in
                  tools manage collective projects effortlessly, so you can
                  focus purely on creating.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="philosophy-section">
          <div className="philosophy-content">
            <h2 className="large-quote">The Lnked Philosophy</h2>
            <p className="philosophy-text">
              &ldquo;Creativity flourishes best in collaboration. Lnked brings
              creators together to explore, build, and grow in ways not possible
              alone.&rdquo;
            </p>
            <div className="philosophy-grid">
              <div>
                <h4 className="philosophy-heading">Rooted in Community</h4>
                <p className="philosophy-description">
                  Inspired by the idea that creative potential multiplies when
                  shared openly.
                </p>
              </div>
              <div>
                <h4 className="philosophy-heading">Driven by Exploration</h4>
                <p className="philosophy-description">
                  Encourages experimentation, innovation, and shared creative
                  journeys.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Build Together?</h2>
            <div className="cta-buttons">
              <Link href="/sign-up" className="btn btn-primary">
                Get Started
              </Link>
              <Link href="/discover" className="btn btn-secondary">
                Explore Collectives
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>Lnked © 2024 — Where creativity meets collaboration</p>
        </footer>
      </div>
    </div>
  );
}
