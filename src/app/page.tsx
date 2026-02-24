'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import ThemeToggle from '@/components/ThemeToggle';

/* ===== Particle System ===== */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const colors = ['#4285f4', '#a855f7', '#06b6d4', '#ec4899', '#4285f4'];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    function createParticles() {
      particles = [];
      const count = Math.min(80, Math.floor(window.innerWidth / 15));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas!.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.opacity;
        ctx!.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = '#4285f4';
            ctx!.globalAlpha = 0.05 * (1 - dist / 120);
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();
    window.addEventListener('resize', () => { resize(); createParticles(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.particleCanvas} />;
}

/* ===== Agent Icon Carousel ===== */
const agentIcons = [
  { icon: '💡', label: 'Vision' },
  { icon: '🎨', label: 'Design' },
  { icon: '⚙️', label: 'Logic' },
  { icon: '🗄️', label: 'Database' },
  { icon: '💻', label: 'Code' },
  { icon: '🧪', label: 'Testing' },
  { icon: '🔒', label: 'Security' },
  { icon: '🚀', label: 'Deploy' },
  { icon: '📊', label: 'Monitor' },
  { icon: '📝', label: 'Docs' },
  { icon: '🔧', label: 'Debug' },
];

/* ===== Feature Cards ===== */
const features = [
  {
    icon: '🗣️',
    title: 'Describe Your Idea',
    description: 'Just tell us what you want in plain English. Our AI understands your vision and asks smart questions to get it right.',
    color: 'var(--color-accent-blue)',
  },
  {
    icon: '🤖',
    title: '50+ AI Agents Collaborate',
    description: 'A massive team of specialized AI agents designs, builds, tests, secures, and deploys your app — fully autonomously.',
    color: 'var(--color-accent-purple)',
  },
  {
    icon: '🧠',
    title: 'Agent Collaboration',
    description: 'Watch specialized AI agents collaborate, review each other\'s work, and iterate until production-ready. No manual configuration needed.',
    color: 'var(--color-accent-teal)',
  },
  {
    icon: '🚀',
    title: 'One-Click Deploy',
    description: 'Click "Go Live" and your app is deployed with SSL, auto-scaling, and monitoring. No servers to manage.',
    color: 'var(--color-accent-pink)',
  },
  {
    icon: '📊',
    title: 'Smart Dashboard',
    description: 'Track users, traffic, and revenue with a simple dashboard. No server metrics — just the numbers that matter.',
    color: 'var(--color-accent-green)',
  },
  {
    icon: '🔒',
    title: 'Secure by Default',
    description: 'Authentication, encryption, and access control are applied automatically. You never configure security.',
    color: 'var(--color-accent-orange)',
  },
];

/* ===== How It Works Steps ===== */
const steps = [
  {
    number: '01',
    title: 'Describe',
    description: '"I want an app where pet owners can find and book nearby groomers."',
    visual: '💬',
  },
  {
    number: '02',
    title: 'AI Designs',
    description: 'Our agents create your app blueprint, design the interface, and set up the database.',
    visual: '🧠',
  },
  {
    number: '03',
    title: 'Refine',
    description: 'Chat with your agents to refine features, adjust design, and iterate — no configuration panels needed.',
    visual: '🎯',
  },
  {
    number: '04',
    title: 'Go Live',
    description: 'One click and your app is live with a real URL, ready for users.',
    visual: '🌍',
  },
];

/* ===== Main Landing Page ===== */
export default function Home() {
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const phrases = [
    'I want an app where pet owners can book groomers...',
    'Build me a booking platform for my coaching business...',
    'I need a portfolio website with a blog...',
    'Create a membership site for my fitness community...',
    'I want an online store for handmade jewelry...',
  ];
  const phraseRef = useRef(0);
  const charRef = useRef(0);
  const directionRef = useRef<'typing' | 'deleting'>('typing');

  useEffect(() => {
    const interval = setInterval(() => {
      const phrase = phrases[phraseRef.current];
      if (directionRef.current === 'typing') {
        charRef.current++;
        setTypedText(phrase.substring(0, charRef.current));
        if (charRef.current >= phrase.length) {
          directionRef.current = 'deleting';
          setTimeout(() => { }, 2000);
        }
      } else {
        charRef.current--;
        setTypedText(phrase.substring(0, charRef.current));
        if (charRef.current <= 0) {
          directionRef.current = 'typing';
          phraseRef.current = (phraseRef.current + 1) % phrases.length;
        }
      }
    }, directionRef.current === 'typing' ? 60 : 30);

    return () => clearInterval(interval);
  }, []);

  /* Scroll reveal observer */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.main}>
      {/* ===== NAVBAR ===== */}
      <nav className={`${styles.navbar} glass`}>
        <div className={styles.navContent}>
          <div className={styles.navBrand}>
            <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
            <span className={styles.logoText}>Evolvable</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#agents" className={styles.navLink}>AI Agents</a>
          </div>
          <div className={styles.navActions}>
            <ThemeToggle />
            <a href="/create" className={styles.navCta}>
              Start Building
              <span className={styles.ctaArrow}>→</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className={styles.hero}>
        <ParticleField />
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>
            <span className={styles.tagDot} />
            AI-Native No-Code Platform
          </div>
          <h1 className={styles.heroTitle}>
            Describe your vision.
            <br />
            <span className={styles.heroGradient}>Agents build it.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Turn plain English into production-ready apps. 50+ AI agents collaborate autonomously.
            <br />
            Zero code. Zero configuration. Pure intelligence.
          </p>

          {/* Typewriter Input */}
          <div className={styles.heroInput}>
            <div className={styles.inputIcon}>✨</div>
            <div className={styles.inputText}>
              {typedText}
              <span className={styles.cursor}>|</span>
            </div>
            <a href="/create" className={styles.inputButton}>
              Create This →
            </a>
          </div>

          <div className={styles.heroMeta}>
            <span>✅ No credit card required</span>
            <span>⚡ Live in under 15 minutes</span>
            <span>🔒 Secure by default</span>
          </div>
        </div>
      </section>

      {/* ===== DARK TRANSITION (Antigravity-style) ===== */}
      <section className={styles.darkTransition}>
        <div className={styles.glowOrb} />
        <div className={styles.darkContent}>
          <div className={`${styles.darkBadge} reveal`}>THE BRAIN OF EVOLVABLE</div>
          <h2 className={`${styles.darkTitle} reveal reveal-delay-1`}>
            50+ AI Agents.
            <br />
            One mission.
          </h2>
          <p className={`${styles.darkSubtitle} reveal reveal-delay-2`}>
            A massive team of specialized AI agents handles every phase of building your app —
            from understanding your idea to deploying it live. Fully autonomous.
          </p>
        </div>

        {/* Agent Icon Carousel */}
        <div className={`${styles.agentCarousel} reveal reveal-delay-3`}>
          <div className={styles.agentTrack}>
            {agentIcons.map((agent, i) => (
              <div
                key={i}
                className={styles.agentIcon}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className={styles.agentCircle}>
                  <span>{agent.icon}</span>
                </div>
                <span className={styles.agentLabel}>{agent.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.sectionTag} reveal`}>FEATURES</div>
          <h2 className={`${styles.sectionTitle} reveal reveal-delay-1`}>
            Everything happens
            <br />
            <span className={styles.heroGradient}>automagically.</span>
          </h2>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature, i) => (
            <div
              key={i}
              className={`${styles.featureCard} glass reveal`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div
                className={styles.featureIcon}
                style={{ background: `${feature.color}15` }}
              >
                {feature.icon}
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.sectionTag} reveal`}>HOW IT WORKS</div>
          <h2 className={`${styles.sectionTitle} reveal reveal-delay-1`}>
            From idea to live app.
            <br />
            Four simple steps.
          </h2>
        </div>

        <div className={styles.stepsContainer}>
          {steps.map((step, i) => (
            <div
              key={i}
              className={`${styles.stepCard} reveal`}
              style={{ transitionDelay: `${i * 0.15}s` }}
            >
              <div className={styles.stepNumber}>{step.number}</div>
              <div className={styles.stepVisual}>{step.visual}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== AGENT INBOX (Antigravity-style bento) ===== */}
      <section id="agents" className={styles.agentSection}>
        <div className={styles.agentBento}>
          <div className={`${styles.bentoLeft} reveal`}>
            <h2 className={styles.bentoTitle}>
              An Agent-First
              <br />
              Experience
            </h2>
            <p className={styles.bentoDesc}>
              Manage your entire app lifecycle from one
              central view. Watch AI agents research,
              design, build, and deploy — all in real time.
            </p>
            <a href="/create" className={styles.bentoButton}>
              Start Creating
            </a>
          </div>

          <div className={`${styles.bentoRight} reveal reveal-delay-2`}>
            <div className={styles.inboxCard}>
              <div className={styles.inboxHeader}>
                <span>Inbox</span>
                <span className={styles.inboxSearch}>🔍</span>
              </div>
              <div className={`${styles.inboxItem} ${styles.inboxRed}`}>
                <div>
                  <div className={styles.inboxTitle}>Designing homepage layout</div>
                  <div className={styles.inboxMeta}>pet-groomer-app</div>
                </div>
                <span className={styles.inboxTime}>now</span>
              </div>
              <div className={`${styles.inboxItem} ${styles.inboxYellow}`}>
                <div>
                  <div className={styles.inboxTitle}>Setting up payment flow</div>
                  <div className={styles.inboxMeta}>pet-groomer-app</div>
                </div>
                <span className={styles.inboxSpinner}>◔</span>
              </div>
              <div className={`${styles.inboxItem} ${styles.inboxGreen}`}>
                <div>
                  <div className={styles.inboxTitle}>Database schema created</div>
                  <div className={styles.inboxMeta}>pet-groomer-app</div>
                </div>
                <span className={styles.inboxCheck}>✓</span>
              </div>
              <div className={`${styles.inboxItem} ${styles.inboxBlue}`}>
                <div>
                  <div className={styles.inboxTitle}>Running security audit</div>
                  <div className={styles.inboxMeta}>pet-groomer-app</div>
                </div>
                <span className={styles.inboxSpinner}>◔</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaCard} reveal`}>
          <h2 className={styles.ctaTitle}>
            Ready to build something
            <span className={styles.heroGradient}> amazing</span>?
          </h2>
          <p className={styles.ctaDesc}>
            Join thousands of creators building apps without writing a single line of code.
          </p>
          <a href="/create" className={styles.ctaButton}>
            <span>Start Creating — Free</span>
            <span>🚀</span>
          </a>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <img src="/icons/icon-192x192.png" alt="Evolvable" className={styles.logoMark} />
            <span className={styles.logoText}>Evolvable</span>
            <p className={styles.footerTagline}>AI-Native No-Code Platform</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="/create">Start Building</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Platform</h4>
              <a href="/project">Agent Studio</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/deploy">Deployment</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 Evolvable by ChanceTEK LLC. evolvable.us — All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}
