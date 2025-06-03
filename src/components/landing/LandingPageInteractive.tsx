'use client';

import { useEffect } from 'react';

export default function LandingPageInteractive() {
  useEffect(() => {
    // Custom Cursor
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');

    // Create cursor elements if they don't exist
    if (!cursor) {
      const cursorEl = document.createElement('div');
      cursorEl.className = 'cursor';
      document.body.appendChild(cursorEl);
    }

    if (!follower) {
      const followerEl = document.createElement('div');
      followerEl.className = 'cursor-follower';
      document.body.appendChild(followerEl);
    }

    const cursorElement = document.querySelector('.cursor') as HTMLElement;
    const followerElement = document.querySelector(
      '.cursor-follower',
    ) as HTMLElement;

    const handleMouseMove = (e: MouseEvent) => {
      if (cursorElement) {
        cursorElement.style.left = `${e.clientX}px`;
        cursorElement.style.top = `${e.clientY}px`;
      }

      setTimeout(() => {
        if (followerElement) {
          followerElement.style.left = `${e.clientX}px`;
          followerElement.style.top = `${e.clientY}px`;
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
    if (!canvas) {
      const canvasEl = document.createElement('canvas');
      canvasEl.id = 'canvas-bg';
      canvasEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
      `;
      document.body.appendChild(canvasEl);
    }

    // Store resize cleanup function to call in main cleanup
    let resizeCleanup: (() => void) | null = null;

    const canvasElement = document.getElementById(
      'canvas-bg',
    ) as HTMLCanvasElement;
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      if (ctx) {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;

        const handleResize = () => {
          canvasElement.width = window.innerWidth;
          canvasElement.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);

        // Store cleanup function
        resizeCleanup = () => {
          window.removeEventListener('resize', handleResize);
        };

        class Particle {
          x: number;
          y: number;
          z: number;
          radius: number;
          velocity: { x: number; y: number; z: number };

          constructor() {
            this.x = Math.random() * canvasElement.width;
            this.y = Math.random() * canvasElement.height;
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

            if (this.x < 0 || this.x > canvasElement.width)
              this.velocity.x *= -1;
            if (this.y < 0 || this.y > canvasElement.height)
              this.velocity.y *= -1;
            if (this.z < 0 || this.z > 1000) this.z = 1000;
          }

          draw() {
            if (!ctx) return;
            const perspective = 1000 / (1000 + this.z);
            const x =
              this.x * perspective +
              (canvasElement.width * (1 - perspective)) / 2;
            const y =
              this.y * perspective +
              (canvasElement.height * (1 - perspective)) / 2;
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
          ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

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
                  p1.x * perspective1 +
                    (canvasElement.width * (1 - perspective1)) / 2,
                  p1.y * perspective1 +
                    (canvasElement.height * (1 - perspective1)) / 2,
                );
                ctx.lineTo(
                  p2.x * perspective2 +
                    (canvasElement.width * (1 - perspective2)) / 2,
                  p2.y * perspective2 +
                    (canvasElement.height * (1 - perspective2)) / 2,
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
      }
    }

    // Create scroll progress element
    if (!document.querySelector('.scroll-progress')) {
      const scrollProgressEl = document.createElement('div');
      scrollProgressEl.className = 'scroll-progress';
      scrollProgressEl.style.cssText = `
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
      `;
      document.body.appendChild(scrollProgressEl);
    }

    return () => {
      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleHeroMouseMove);
      window.removeEventListener('scroll', handleParallaxScroll);
      window.removeEventListener('scroll', handleOptimizedScroll);

      // Remove created DOM elements to prevent persistence across pages
      const canvasElement = document.getElementById('canvas-bg');
      if (canvasElement) {
        canvasElement.remove();
      }

      const cursorElement = document.querySelector('.cursor');
      if (cursorElement) {
        cursorElement.remove();
      }

      const followerElement = document.querySelector('.cursor-follower');
      if (followerElement) {
        followerElement.remove();
      }

      const scrollProgressElement = document.querySelector('.scroll-progress');
      if (scrollProgressElement) {
        scrollProgressElement.remove();
      }

      // Call resize cleanup function
      if (resizeCleanup) {
        resizeCleanup();
      }
    };
  }, []);

  return (
    <>
      {/* Interactive element styles */}
      <style jsx global>{`
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
          transition: all 0s ease;
          z-index: 9998;
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
      `}</style>
    </>
  );
}
