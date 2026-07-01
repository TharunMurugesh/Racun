import React from 'react';

export default function LandingPage({ onLaunch }) {
  return (
    <div className="landing-container animate-fade-in" style={{ padding: '60px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <header style={{ textAlign: 'center', marginBottom: '80px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '99px', marginBottom: '24px' }}>
          <span className="badge badge-purple" style={{ border: 'none', padding: '2px 6px' }}>v2.0.0</span>
          <span style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: '500' }}>Redrob Hackathon Reasoning Engine</span>
        </div>
        <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '24px', fontWeight: '800' }}>
          Candidate Matching Powered by <span className="gradient-text">Reasoning Evidence</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '720px', margin: '0 auto 36px', lineHeight: '1.6' }}>
          RACUN is a requirement-aware ranking system. It does not look for keywords. It asks: "What evidence exists that this candidate satisfies the requirement — and can we trust it?"
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onLaunch} style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
            Launch Dashboard
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
          </button>
          <a href="#philosophy" className="btn-secondary" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
            Read Blueprint
          </a>
        </div>
      </header>

      {/* Philosophy Section */}
      <section id="philosophy" style={{ marginBottom: '100px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '48px' }}>The 5-Step Reasoning Pipeline</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { step: '01', title: 'Evidence Collection', desc: 'Queries ontology terms to scan resume descriptions, skill listings, certifications, and assessments.' },
            { step: '02', title: 'Trust Validation', desc: 'Validates claims by comparing them against career history durations, overlap timelines, and assessment scores.' },
            { step: '03', title: 'Strength Evaluation', desc: 'Weights evidence by its hierarchy source. Direct career history experience dominates secondary claims.' },
            { step: '04', title: 'Consistency Audit', desc: 'Checks cross-source agreement. Conflicting assessments or claims penalize candidate trust scores.' },
            { step: '05', title: 'Satisfaction Mapping', desc: 'Determines requirement coverage level (Satisfied, Partially, Weakly) to generate a numeric score.' }
          ].map((item, index) => (
            <div key={index} className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '3rem', fontWeight: '800', opacity: 0.1, position: 'absolute', top: '10px', right: '15px', color: 'var(--accent-primary)' }}>{item.step}</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-primary)' }}>{item.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section style={{ marginBottom: '80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '48px' }}>Core Capabilities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
          
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', gap: '20px' }}>
            <div style={{ background: 'rgba(139,92,246,0.1)', padding: '12px', borderRadius: '12px', height: 'fit-content' }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Integrity Checking</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Detects timeline overlaps, experiences inflation, unsupported claims, and grade discrepancies. Weeds out fraudulent profiles automatically.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '30px', display: 'flex', gap: '20px' }}>
            <div style={{ background: 'rgba(13,148,136,0.1)', padding: '12px', borderRadius: '12px', height: 'fit-content' }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-teal)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Configurable Ontologies</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Tweak weights, thresholds, synonyms, and validation rules through the settings console. Instantly recalculate scores across candidates.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '30px', display: 'flex', gap: '20px' }}>
            <div style={{ background: 'rgba(217,119,6,0.1)', padding: '12px', borderRadius: '12px', height: 'fit-content' }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Traceable Audit Logs</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                View step-by-step scoring logic for every candidate. Understand exactly why they received a specific score and review corroborating evidence snippets.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '40px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <p>© 2026 RACUN V2 talent reasoning framework. Built for Redrob Hackathon. Designed by Team Antigravity.</p>
      </footer>
    </div>
  );
}
