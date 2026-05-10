import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RegisterModal from '../components/RegisterModal';

function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return [val, ref];
}

function StatItem({ target, label, suffix = '+' }) {
  const [val, ref] = useCountUp(target);
  return (
    <div className="stat-item" ref={ref}>
      <div className="stat-num">{val.toLocaleString()}{val >= target ? suffix : ''}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Cursor
  useEffect(() => {
    const cur = document.getElementById('cur');
    const ring = document.getElementById('ring');
    if (!cur || !ring) return;
    const move = (e) => {
      cur.style.transform = `translate(${e.clientX - 5}px,${e.clientY - 5}px)`;
      ring.style.transform = `translate(${e.clientX - 17}px,${e.clientY - 17}px)`;
    };
    document.addEventListener('mousemove', move);
    return () => document.removeEventListener('mousemove', move);
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.13 }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Particle canvas
  useEffect(() => {
    const cvs = document.getElementById('heroParticles');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const resize = () => { cvs.width = innerWidth; cvs.height = innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * cvs.width, y: Math.random() * cvs.height,
      r: Math.random() * 1.4 + 0.3, dx: (Math.random() - .5) * .28, dy: (Math.random() - .5) * .28,
      a: Math.random() * .4 + .08, c: Math.random() > .5 ? '91,45,142' : '201,168,76',
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > cvs.width) p.dx *= -1;
        if (p.y < 0 || p.y > cvs.height) p.dy *= -1;
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(91,45,142,${.09 * (1 - d / 110)})`; ctx.lineWidth = .5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="landing-page">
      <div className="cur" id="cur" />
      <div className="ring" id="ring" />
      <Navbar onJoinClick={() => setShowModal(true)} />

      {/* Hero */}
      <section className="hero" id="home">
        <canvas id="heroParticles" />
        <div className="g1" /><div className="g2" /><div className="g3" />
        <div className="hero-grid" />
        <div className="hero-vline" />
        <div className="hero-left">
          <div className="hero-badge"><span className="badge-dot" />Manav Rachna University · Alumni Network</div>
          <h1 className="hero-title"><span className="outline">Connect.</span><br /><em>Mentor.</em><br />Grow Together.</h1>
          <div className="hero-rule" />
          <p className="hero-sub">An AI-powered alumni networking platform that intelligently bridges the gap between students and industry professionals — building careers, one meaningful connection at a time.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setShowModal(true)}><span>Get Early Access</span><span>→</span></button>
            <button className="btn-outline" onClick={() => document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' })}>See How It Works</button>
          </div>
          <div className="hero-trust">
            <div className="avatars"><span>AK</span><span>RS</span><span>PM</span><span>VT</span><span>SJ</span></div>
            <div className="trust-txt"><strong>2,400+ alumni</strong> already on the waitlist<br />across 40 industries worldwide</div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-mockup">
            <div className="mock-float mf1">
              <div className="fl-lbl">Match Score</div>
              <div className="fl-val">92%</div>
              <div className="fl-sub">Industry alignment · Tech</div>
            </div>
            <div className="mock-main">
              <div className="mock-hd">
                <div className="mock-av">👩‍💼</div>
                <div><div className="mock-name">Priya Sharma</div><div className="mock-role">Senior PM · Google · Batch 2019</div></div>
                <div className="mock-ai-tag">AI MATCH</div>
              </div>
              <div className="mock-score-box">
                <div className="mock-score-top"><span className="score-lbl">Compatibility Score</span><span className="score-val">92%</span></div>
                <div className="track"><div className="fill" /></div>
              </div>
              <div className="mock-tags">
                <span className="tag tag-v">Product Strategy</span>
                <span className="tag tag-g">Leadership</span>
                <span className="tag tag-v">UX Research</span>
                <span className="tag tag-g">Tech Industry</span>
              </div>
            </div>
            <div className="mock-float mf2">
              <div className="fl-lbl"><span className="live-dot" />Live Connections</div>
              <div className="fl-val">1,284</div>
              <div className="fl-sub">Mentorships active this month</div>
            </div>
          </div>
        </div>
        <div className="scroll-hint">
          <div className="s-txt">Scroll</div>
          <div className="s-line" />
        </div>
      </section>

      {/* Stats */}
      <div className="stats-band">
        <StatItem target={10000} label="Alumni Globally" />
        <StatItem target={95} label="Match Accuracy %" suffix="%" />
        <StatItem target={40} label="Industry Sectors" />
        <StatItem target={5000} label="Mentorship Hours" />
      </div>

      {/* Problem */}
      <section id="problem">
        <div className="split">
          <div>
            <p className="tag-line reveal">The Challenge</p>
            <h2 className="sec-title reveal d1">A <em>fragmented</em><br />alumni ecosystem</h2>
            <p style={{ marginTop: '1.6rem', color: '#6b6780', lineHeight: 1.88, fontSize: '.95rem' }} className="reveal d2">Alumni of Manav Rachna University span industries and continents, yet structured interaction with current students remains sparse. Career guidance, mentorship, and collaborative projects suffer from the absence of an intelligent matchmaking layer.</p>
            <p style={{ marginTop: '1rem', color: '#6b6780', lineHeight: 1.88, fontSize: '.95rem' }} className="reveal d3">Alumni engagement is fragmented and underutilised — a vast reservoir of knowledge and opportunity left untapped.</p>
          </div>
          <div className="prob-card reveal d1">
            <h3>Problem Statement</h3>
            <p>Manav Rachna University requires a centralised alumni networking system that intelligently connects students with alumni mentors based on career aspirations and industry domains. Currently, alumni engagement is fragmented and underutilised.</p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" style={{ background: '#fff', borderTop: '1px solid rgba(91,45,142,.15)' }}>
        <p className="tag-line reveal">AI Solution</p>
        <h2 className="sec-title reveal d1">Intelligent <em>matchmaking</em><br />at scale</h2>
        <div className="sol-grid">
          {[
            { icon: '🧠', title: 'Career Trajectory Analysis', desc: 'The AI engine analyses alumni career paths and maps them against student aspirations using shared academic background, industry alignment, and skill interests.' },
            { icon: '🔗', title: 'Smart Compatibility Scores', desc: 'Generates real-time compatibility scores and recommends high-impact mentorship connections — predicting which relationships will yield the best career outcomes.' },
            { icon: '📈', title: 'Continuous Learning', desc: 'Over time, the system learns from engagement outcomes and refines its matching accuracy — a self-improving loop aligned with CO and PO for lifelong growth.' },
          ].map((c, i) => (
            <div className={`sol-card reveal${i ? ` d${i}` : ''}`} key={c.title}>
              <div className="sol-icon">{c.icon}</div>
              <h4>{c.title}</h4>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation */}
      <section id="implementation" className="impl-sec">
        <p className="tag-line reveal" style={{ color: 'rgba(255,255,255,.35)' }}>Implementation Approach</p>
        <h2 className="sec-title reveal d1" style={{ color: '#fff' }}>Four steps to a <em style={{ color: '#e8c97a' }}>smarter</em> network</h2>
        <div className="impl-steps">
          {[
            { n: '01', t: 'Profile Creation', d: 'Alumni create rich professional profiles specifying expertise domains, industries, and areas they are willing to mentor in.' },
            { n: '02', t: 'Student Onboarding', d: 'Students define their career goals, target industries, and skill interests to fuel the AI matching engine with meaningful data.' },
            { n: '03', t: 'AI Matching', d: 'The system generates compatibility scores and recommends the best mentorship connections based on multi-dimensional alignment.' },
            { n: '04', t: 'Engagement Analytics', d: 'Integrated communication tools and analytics dashboards continuously monitor mentorship effectiveness and refine the model.' },
          ].map((s, i) => (
            <div className={`impl-step reveal${i ? ` d${i}` : ''}`} key={s.n}>
              <span className="step-num">{s.n}</span>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section id="impact">
        <p className="tag-line reveal">Impact &amp; Benefits</p>
        <h2 className="sec-title reveal d1">Building futures that <em>last</em></h2>
        <div className="impact-grid">
          {[
            { n: '01', t: 'Stronger Alumni-Student Bonds', d: 'Meaningful, structured connections replace ad-hoc interactions — creating a vibrant, engaged university community that grows year on year.' },
            { n: '02', t: 'Enhanced Career Guidance', d: 'Students receive personalised mentorship aligned with their specific aspirations, dramatically accelerating their professional journeys.' },
            { n: '03', t: 'Elevated Institutional Brand', d: "A world-class alumni network signals institutional excellence — improving Manav Rachna's rankings and reputation on the global stage." },
            { n: '04', t: 'Lifelong Professional Network', d: 'Alumni stay connected for collaborative projects, hiring pipelines, and industry partnerships — long after graduation.' },
          ].map((c, i) => (
            <div className={`impact-card reveal${i ? ` d${i}` : ''}`} key={c.n}>
              <div className="impact-num">{c.n}</div>
              <div><h4>{c.t}</h4><p>{c.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Preview */}
      <section id="preview" style={{ background: '#fff', borderTop: '1px solid rgba(91,45,142,.15)' }}>
        <p className="tag-line reveal">Inside the Platform</p>
        <h2 className="sec-title reveal d1">See what's waiting <em>inside</em></h2>
        <p style={{ color: '#6b6780', fontSize: '.95rem', marginTop: '1rem', maxWidth: 520, lineHeight: 1.8 }} className="reveal d2">
          Once you join, here's what the full MRU Alumni Network looks like — built for students, alumni, and faculty.
        </p>

        <div className="preview-grid">
          {/* Dashboard preview */}
          <div className="preview-card reveal">
            <div className="preview-screen">
              <div className="preview-topbar">
                <div className="preview-dot r" /><div className="preview-dot y" /><div className="preview-dot g" />
                <span>Dashboard — AI Matches</span>
              </div>
              <div className="preview-body">
                <div className="preview-sidebar-mini">
                  {['⚡','🏠','🤝','📊','👤'].map((ic,i) => <div key={i} className="psb-item">{ic}</div>)}
                </div>
                <div className="preview-content-mini">
                  <div className="pmini-title">Your AI-Matched Mentors</div>
                  {[
                    { name: 'Priya Sharma', role: 'PM · Google', score: 92, color: '#7c45b8' },
                    { name: 'Rahul Verma',  role: 'SDE · Amazon', score: 87, color: '#c9a84c' },
                    { name: 'Ananya Singh', role: 'Designer · Flipkart', score: 81, color: '#5b2d8e' },
                  ].map(m => (
                    <div key={m.name} className="pmini-card">
                      <div className="pmini-av" style={{ background: m.color }}>{m.name[0]}</div>
                      <div className="pmini-info">
                        <div className="pmini-name">{m.name}</div>
                        <div className="pmini-role">{m.role}</div>
                      </div>
                      <div className="pmini-score">{m.score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="preview-label">🧠 AI-Powered Matching</div>
            <p className="preview-desc">Get ranked mentor recommendations based on your career goals and target industry.</p>
          </div>

          {/* Feed preview */}
          <div className="preview-card reveal d1">
            <div className="preview-screen">
              <div className="preview-topbar">
                <div className="preview-dot r" /><div className="preview-dot y" /><div className="preview-dot g" />
                <span>Feed — MRU Network</span>
              </div>
              <div className="preview-body" style={{ flexDirection: 'column', padding: '1rem' }}>
                <div className="pfeed-compose">What's happening in your career?</div>
                {[
                  { name: 'Arjun K.', text: 'Just got placed at Microsoft! Grateful to my mentor from MRU 🎉', time: '2m' },
                  { name: 'Priya S.', text: 'Hosting a free session on Product Management this Saturday. DM me!', time: '1h' },
                  { name: 'Rahul V.', text: 'Tips for cracking FAANG interviews — thread 🧵', time: '3h' },
                ].map(p => (
                  <div key={p.name} className="pfeed-post">
                    <div className="pfeed-av">{p.name[0]}</div>
                    <div>
                      <div className="pfeed-name">{p.name} <span className="pfeed-time">· {p.time}</span></div>
                      <div className="pfeed-text">{p.text}</div>
                      <div className="pfeed-actions">❤️ 🔁 💬</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="preview-label">🏠 Community Feed</div>
            <p className="preview-desc">Share updates, opportunities, and insights with the entire MRU network.</p>
          </div>

          {/* Chat preview */}
          <div className="preview-card reveal d2">
            <div className="preview-screen">
              <div className="preview-topbar">
                <div className="preview-dot r" /><div className="preview-dot y" /><div className="preview-dot g" />
                <span>Messages — Real-time Chat</span>
              </div>
              <div className="preview-body" style={{ flexDirection: 'column', padding: '1rem', gap: '.5rem' }}>
                <div className="pchat-header">
                  <div className="pmini-av" style={{ background: '#7c45b8', width: 28, height: 28, fontSize: '.65rem' }}>PS</div>
                  <div style={{ fontSize: '.72rem', fontWeight: 600 }}>Priya Sharma <span style={{ color: '#4ade80' }}>● Online</span></div>
                </div>
                {[
                  { text: 'Hi! I saw your request. Happy to help 😊', mine: false },
                  { text: 'Thank you so much! I want to get into Product Management.', mine: true },
                  { text: 'Great! Let\'s schedule a call this weekend.', mine: false },
                  { text: 'That would be amazing! Saturday works for me.', mine: true },
                ].map((m, i) => (
                  <div key={i} className={`pchat-msg ${m.mine ? 'pchat-mine' : 'pchat-theirs'}`}>
                    {m.text}
                  </div>
                ))}
                <div className="pchat-input">Type a message...</div>
              </div>
            </div>
            <div className="preview-label">💬 Real-time Messaging</div>
            <p className="preview-desc">Chat directly with your mentor via Socket.io powered real-time messaging.</p>
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section style={{ background: '#0d0d14', padding: '5rem' }}>
        <p className="tag-line reveal" style={{ color: 'rgba(255,255,255,.3)' }}>Everything you need</p>
        <h2 className="sec-title reveal d1" style={{ color: '#fff' }}>One platform. <em style={{ color: '#e8c97a' }}>Every feature.</em></h2>
        <div className="features-grid">
          {[
            { icon: '🧠', title: 'AI Matching',        desc: 'Smart compatibility scores based on industry, skills, and career goals.' },
            { icon: '🤝', title: 'Mentorship System',  desc: 'Request, accept, track sessions, and log progress with your mentor.' },
            { icon: '💬', title: 'Real-time Chat',     desc: 'Socket.io powered instant messaging between students and alumni.' },
            { icon: '🏠', title: 'Community Feed',     desc: 'Post updates, share opportunities, like and reply to the network.' },
            { icon: '👤', title: 'Rich Profiles',      desc: 'Detailed profiles with skills, bio, company, batch and career goals.' },
            { icon: '📊', title: 'Analytics',          desc: 'Track mentorship effectiveness, sessions, and platform-wide stats.' },
          ].map((f, i) => (
            <div key={f.title} className={`feature-item reveal${i % 3 ? ` d${i % 3}` : ''}`}>
              <div className="feature-icon">{f.icon}</div>
              <h4 className="feature-title">{f.title}</h4>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-sec">
        <p className="tag-line" style={{ justifyContent: 'center', color: '#c9a84c' }}>Join the Network</p>
        <h2 className="sec-title">Ready to <em>connect</em><br />with your future?</h2>
        <p>Whether you are an alumnus looking to give back or a student seeking direction — AlumniAI is your bridge to a more purposeful career.</p>
        <div className="cta-btns">
          <button className="btn-gold" onClick={() => setShowModal(true)}>Register as Alumni</button>
          <button className="cta-outline" onClick={() => setShowModal(true)}>Register as Student</button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="foot-logo">ManavRachna · Alumni Network</div>
        <div>© 2026 · AI-Enhanced Alumni Networking &amp; Mentorship System</div>
        <div>Final Year Capstone · MRU</div>
      </footer>

      {showModal && <RegisterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
