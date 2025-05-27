'use client';

import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Custom Cursor
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    const handleMouseMove = (e: MouseEvent) => {
      if (cursor) {
        (cursor as HTMLElement).style.left = e.clientX + 'px';
        (cursor as HTMLElement).style.top = e.clientY + 'px';
      }

      setTimeout(() => {
        if (follower) {
          (follower as HTMLElement).style.left = e.clientX + 'px';
          (follower as HTMLElement).style.top = e.clientY + 'px';
        }
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);

    // 3D Tilt Effect on Hero
    const hero = document.querySelector('.hero-content');
    const handleHeroMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xPos = (clientX / innerWidth - 0.5) * 20;
      const yPos = (clientY / innerHeight - 0.5) * 20;

      if (hero) {
        (hero as HTMLElement).style.transform =
          `rotateY(${xPos}deg) rotateX(${-yPos}deg)`;
      }
    };

    document.addEventListener('mousemove', handleHeroMouseMove);

    // Parallax Scrolling - Improved for better alignment
    const parallaxElements = document.querySelectorAll(
      '.feature-card, .large-quote',
    );
    const handleParallaxScroll = () => {
      const scrolled = window.pageYOffset;
      const windowHeight = window.innerHeight;

      parallaxElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrolled;
        const elementHeight = rect.height;

        // Calculate when element should start moving
        const startOffset = elementTop - windowHeight;
        const endOffset = elementTop + elementHeight;

        // Only apply parallax when element is in view range
        if (scrolled > startOffset && scrolled < endOffset) {
          const progress = (scrolled - startOffset) / (endOffset - startOffset);
          const speed = 0.3 + index * 0.05; // Reduced speed for better alignment
          const yPos = -(progress * 100 * speed);
          (el as HTMLElement).style.transform = `translateY(${yPos}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleParallaxScroll);

    // Enhanced scroll-based animations
    const handleScrollAnimations = () => {
      const scrolled = window.pageYOffset;
      const windowHeight = window.innerHeight;

      // Animate elements based on their position relative to viewport
      const animatedElements = document.querySelectorAll(
        '.feature-card, .large-quote, .philosophy-content',
      );

      animatedElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top;
        const elementHeight = rect.height;

        // Calculate visibility percentage
        const visiblePercentage = Math.max(
          0,
          Math.min(
            1,
            (windowHeight - elementTop) / (windowHeight + elementHeight),
          ),
        );

        // Apply smooth opacity and transform based on visibility
        if (visiblePercentage > 0.1) {
          const opacity = Math.min(1, visiblePercentage * 1.5);
          const translateY = (1 - visiblePercentage) * 20;

          (element as HTMLElement).style.opacity = opacity.toString();
          (element as HTMLElement).style.transform =
            `translateY(${translateY}px)`;
        }
      });

      // Update scroll progress
      const totalHeight = document.documentElement.scrollHeight - windowHeight;
      const progress = scrolled / totalHeight;
      const scrollProgress = document.querySelector('.scroll-progress');
      if (scrollProgress) {
        (scrollProgress as HTMLElement).style.transform = `scaleX(${progress})`;
      }
    };

    // Use requestAnimationFrame for smoother animations
    let ticking = false;
    const handleOptimizedScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScrollAnimations();
          handleParallaxScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleOptimizedScroll);

    // Initialize elements for animation
    document
      .querySelectorAll('.feature-card, .large-quote, .philosophy-content')
      .forEach((el) => {
        (el as HTMLElement).style.opacity = '0';
        (el as HTMLElement).style.transform = 'translateY(20px)';
        (el as HTMLElement).style.transition = 'none'; // Remove CSS transitions, use JS instead
      });

    // Initial animation check
    handleScrollAnimations();

    // Canvas Background Animation
    const canvas = document.getElementById('canvas-bg') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const handleResize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        class Particle {
          x: number;
          y: number;
          z: number;
          radius: number;
          velocity: { x: number; y: number; z: number };

          constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.z = Math.random() * 1000;
            this.radius = Math.random() * 2;
            this.velocity = {
              x: (Math.random() - 0.5) * 0.5,
              y: (Math.random() - 0.5) * 0.5,
              z: Math.random() * 0.5,
            };
          }

          update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.z += this.velocity.z;

            if (this.x < 0 || this.x > canvas.width) this.velocity.x *= -1;
            if (this.y < 0 || this.y > canvas.height) this.velocity.y *= -1;
            if (this.z < 0 || this.z > 1000) this.z = 1000;
          }

          draw() {
            if (!ctx) return;
            const perspective = 1000 / (1000 + this.z);
            const x =
              this.x * perspective + (canvas.width * (1 - perspective)) / 2;
            const y =
              this.y * perspective + (canvas.height * (1 - perspective)) / 2;
            const radius = this.radius * perspective;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(10, 9, 8, ${0.5 * perspective})`;
            ctx.fill();
          }
        }

        const particles = Array.from({ length: 200 }, () => new Particle());

        function animate() {
          if (!ctx) return;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          particles.forEach((particle) => {
            particle.update();
            particle.draw();
          });

          // Connect nearby particles
          particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach((p2) => {
              const distance = Math.sqrt(
                Math.pow(p1.x - p2.x, 2) +
                  Math.pow(p1.y - p2.y, 2) +
                  Math.pow(p1.z - p2.z, 2),
              );

              if (distance < 150 && ctx) {
                const perspective1 = 1000 / (1000 + p1.z);
                const perspective2 = 1000 / (1000 + p2.z);
                const avgPerspective = (perspective1 + perspective2) / 2;

                ctx.beginPath();
                ctx.moveTo(
                  p1.x * perspective1 + (canvas.width * (1 - perspective1)) / 2,
                  p1.y * perspective1 +
                    (canvas.height * (1 - perspective1)) / 2,
                );
                ctx.lineTo(
                  p2.x * perspective2 + (canvas.width * (1 - perspective2)) / 2,
                  p2.y * perspective2 +
                    (canvas.height * (1 - perspective2)) / 2,
                );
                ctx.strokeStyle = `rgba(10, 9, 8, ${0.1 * avgPerspective * (1 - distance / 150)})`;
                ctx.stroke();
              }
            });
          });

          requestAnimationFrame(animate);
        }

        animate();

        // Letter hover effect
        const letters = document.querySelectorAll('.hero h1 span');
        letters.forEach((letter, index) => {
          letter.addEventListener('mouseenter', () => {
            (letter as HTMLElement).style.transform =
              `translateZ(150px) rotateY(${Math.random() * 30 - 15}deg) rotateX(${Math.random() * 30 - 15}deg)`;
            (letter as HTMLElement).style.color = 'var(--gold)';
          });

          letter.addEventListener('mouseleave', () => {
            setTimeout(() => {
              (letter as HTMLElement).style.transform =
                'translateZ(0) rotateY(0) rotateX(0)';
              (letter as HTMLElement).style.color = 'var(--ink)';
            }, 100 * index);
          });
        });

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      }
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleHeroMouseMove);
      window.removeEventListener('scroll', handleParallaxScroll);
      window.removeEventListener('scroll', handleOptimizedScroll);
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@300;400;500;600;700&family=Instrument+Sans:wght@400;500;600&display=swap');

        :root {
          --ink: #0a0908;
          --paper: #ffffff;
          --gold: #dda15e;
          --rust: #bc6c25;
          --sage: #606c38;
          --cream: #f8f8f8;
        }

        body {
          font-family:
            'Instrument Sans',
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
          line-height: 1.6;
          color: var(--ink);
          background: var(--paper);
          overflow-x: hidden;
          cursor: default;
        }

        /* Custom Cursor */
        .cursor {
          width: 20px;
          height: 20px;
          border: 2px solid var(--ink);
          border-radius: 50%;
          position: fixed;
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition: all 0.15s ease;
          z-index: 9999;
          mix-blend-mode: difference;
        }

        .cursor-follower {
          width: 40px;
          height: 40px;
          background: var(--gold);
          opacity: 0.3;
          border-radius: 50%;
          position: fixed;
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition: all 0.3s ease;
          z-index: 9998;
        }

        /* Typography */
        h1,
        h2,
        h3 {
          font-family: 'Source Serif 4', serif;
          font-weight: 500;
          letter-spacing: -0.01em;
        }

        /* 3D Canvas Background */
        #canvas-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
        }

        /* Main Container */
        .main-container {
          position: relative;
          z-index: 1;
        }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        .hero-content {
          text-align: center;
          transform: translateZ(0);
          will-change: transform;
        }

        .hero h1 {
          font-size: clamp(5rem, 15vw, 12rem);
          font-weight: 600;
          margin-bottom: 2rem;
          transform: translateZ(100px);
          transition: transform 0.3s ease;
        }

        .hero h1 span {
          display: inline-block;
          transition: transform 0.3s ease;
        }

        .hero-subtitle {
          font-size: clamp(1.2rem, 2.5vw, 1.8rem);
          max-width: 800px;
          margin: 0 auto 3rem;
          opacity: 0.8;
          font-weight: 400;
          line-height: 1.6;
          transform: translateZ(50px);
          padding: 0 2rem;
        }

        /* Flowing Sections */
        .flow-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .flow-content {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 4rem 2rem;
          transform-style: preserve-3d;
          position: relative;
          z-index: 2;
        }

        /* Feature Grid with 3D Cards */
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 3rem;
          padding: 2rem 0;
          position: relative;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(15px);
          padding: 3rem;
          border-radius: 8px;
          transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
          transform: translateZ(0) rotateX(0) rotateY(0);
          transform-style: preserve-3d;
          will-change: transform;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, var(--gold) 100%);
          opacity: 0;
          transition: opacity 0.6s ease;
          z-index: -1;
        }

        .feature-card:hover {
          transform: translateZ(30px) rotateX(3deg) rotateY(-3deg);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .feature-card:hover::before {
          opacity: 0.08;
        }

        .feature-card h3 {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          color: var(--ink);
          transform: translateZ(20px);
          line-height: 1.3;
        }

        .feature-card p {
          line-height: 1.7;
          color: var(--ink);
          opacity: 0.85;
          transform: translateZ(10px);
          font-size: 1rem;
        }

        /* Flowing Text Sections */
        .text-flow {
          padding: 8rem 0;
          position: relative;
        }

        .text-flow-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .large-quote {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-family: 'Source Serif 4', serif;
          font-weight: 500;
          line-height: 1.2;
          margin-bottom: 3rem;
          position: relative;
          transform-style: preserve-3d;
          text-align: center;
          max-width: 1000px;
          margin-left: auto;
          margin-right: auto;
        }

        .large-quote::before {
          content: '"';
          position: absolute;
          top: -1.5rem;
          left: -2rem;
          font-size: 6rem;
          opacity: 0.08;
          font-family: 'Source Serif 4', serif;
          transform: translateZ(-50px);
          color: var(--gold);
        }

        /* Morphing Shapes */
        .morph-shape {
          display: none;
        }

        .morph-shape.shape-1 {
          display: none;
        }

        .morph-shape.shape-2 {
          display: none;
        }

        .morph-shape.shape-3 {
          display: none;
        }

        @keyframes morph {
          /* Animation removed */
        }

        /* Philosophy Section */
        .philosophy-section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          background: var(--paper);
          position: relative;
          overflow: hidden;
          padding: 4rem 0;
          scroll-snap-align: start;
        }

        .philosophy-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        /* CTA Section */
        .cta-section {
          min-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          background: var(--paper);
          color: var(--ink);
          overflow: hidden;
          padding: 4rem 2rem;
          scroll-snap-align: start;
        }

        .cta-content {
          position: relative;
          z-index: 2;
        }

        .cta-content h2 {
          font-size: clamp(2.5rem, 6vw, 5rem);
          margin-bottom: 3rem;
          font-weight: 500;
        }

        .cta-buttons {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          padding: 1.5rem 3rem;
          font-size: 1.1rem;
          text-decoration: none;
          border: 2px solid var(--ink);
          color: var(--ink);
          background: transparent;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: inline-block;
        }

        .btn:first-child {
          background: var(--ink);
          color: var(--paper);
        }

        .btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: var(--gold);
          transition: left 0.3s ease;
          z-index: -1;
        }

        .btn:hover {
          color: var(--paper);
          border-color: var(--gold);
        }

        .btn:hover::before {
          left: 0;
        }

        .btn:first-child:hover {
          color: var(--ink);
        }

        /* Scroll Progress */
        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--gold);
          transform-origin: left;
          transform: scaleX(0);
          z-index: 1000;
          transition: transform 0.1s ease;
        }

        /* Smooth scrolling for the entire page */
        html {
          scroll-behavior: smooth;
          scroll-snap-type: y proximity;
        }

        /* Responsive */
        @media (max-width: 968px) {
          .philosophy-content {
            padding: 0 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .feature-grid {
            grid-template-columns: 1fr;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }

          .btn {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>

      {/* Custom Cursor */}
      <div className="cursor"></div>
      <div className="cursor-follower"></div>

      {/* Scroll Progress */}
      <div className="scroll-progress"></div>

      {/* Canvas Background */}
      <canvas id="canvas-bg"></canvas>

      {/* Main Container */}
      <div className="main-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>
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
            <h2 className="large-quote">Why Choose Lnked?</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Collective Growth & Shared Discovery</h3>
                <p>
                  <strong>Grow Faster Together</strong> — Form or join
                  collectives, combining audiences and creativity. Collaboration
                  accelerates discovery, amplifying everyone&apos;s reach.
                </p>
                <p style={{ marginTop: '1rem' }}>
                  <strong>Collaborative Discovery</strong> — Algorithms
                  optimized to surface group projects and collective content,
                  making every creator visible and valued.
                </p>
                <p style={{ marginTop: '1rem' }}>
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
                <p style={{ marginTop: '1rem' }}>
                  <strong>Your Ideas, Your Terms</strong> — Lnked gives you the
                  freedom to customize how your collaborations work, allowing
                  you to build meaningful creative partnerships.
                </p>
                <p style={{ marginTop: '1rem' }}>
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
                <p style={{ marginTop: '1rem' }}>
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
            <p
              style={{
                fontSize: '1.8rem',
                fontWeight: 300,
                marginBottom: '3rem',
                fontStyle: 'italic',
                maxWidth: '900px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              &ldquo;Creativity flourishes best in collaboration. Lnked brings
              creators together to explore, build, and grow in ways not possible
              alone.&rdquo;
            </p>
            <div
              style={{
                marginTop: '4rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '3rem',
                maxWidth: '800px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                    color: 'var(--rust)',
                  }}
                >
                  Rooted in Community
                </h4>
                <p style={{ opacity: 0.8 }}>
                  Inspired by the idea that creative potential multiplies when
                  shared openly.
                </p>
              </div>
              <div>
                <h4
                  style={{
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                    color: 'var(--rust)',
                  }}
                >
                  Driven by Exploration
                </h4>
                <p style={{ opacity: 0.8 }}>
                  Encourages experimentation, innovation, and shared creative
                  journeys.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* Footer */}
        <footer
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            opacity: 0.5,
            fontSize: '0.9rem',
          }}
        >
          <p>Lnked © 2024 — Where creativity meets collaboration</p>
        </footer>
      </div>
    </>
  );
}

export const dynamic = 'force-static'; // ensure RSC caching for landing
