import React, { useState } from 'react';

export default function AuthProfile({ user, onLogin, onLogout, onUpdateRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({
        name: 'Shreyas',
        email: email,
        role: 'Lead TA Recruiter',
        org: 'Redrob Recruiting Corp',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'
      });
    }, 800);
  };

  const isGuest = !user || !user.email;

  if (isGuest) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', padding: '20px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px 30px', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px', textAlign: 'center' }}>Welcome to <span className="gradient-text">RACUN V2</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '32px' }}>
            Talent Reasoning Command Center
          </p>

          {error && (
            <div style={{ padding: '12px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="shreyas@redrob.io" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'skeleton-loading 1s linear infinite' }} />
                  Verifying Credentials...
                </div>
              ) : 'Authenticate Access'}
            </button>
          </form>

          <div style={{ position: 'relative', margin: '30px 0 20px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: 'var(--border-light)', zIndex: '1' }} />
            <span style={{ position: 'relative', zIndex: '2', background: 'var(--bg-secondary)', padding: '0 12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or Continue With</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button className="btn-secondary" onClick={() => onLogin({ name: 'Shreyas (Demo)', email: 'demo@redrob.io', role: 'Lead TA Recruiter', org: 'Redrob Recruiting Corp', avatar: '' })} style={{ padding: '10px' }}>
              Google
            </button>
            <button className="btn-secondary" onClick={() => onLogin({ name: 'Shreyas (Demo)', email: 'demo@redrob.io', role: 'Lead TA Recruiter', org: 'Redrob Recruiting Corp', avatar: '' })} style={{ padding: '10px' }}>
              Redrob SSO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile page if logged in
  return (
    <div className="animate-slide-up" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '24px' }}>User <span className="gradient-text">Profile & Access Control</span></h2>
      
      <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid var(--border-light)', paddingBottom: '30px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: '800', border: '2px solid var(--border-medium)' }}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{user.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>{user.email}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-purple">{user.role}</span>
              <span className="badge badge-gray">{user.org}</span>
            </div>
          </div>
        </div>

        {/* Roles & Controls */}
        <div>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Switch User Permissions (Simulation)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { role: 'Lead TA Recruiter', desc: 'Manage candidate lists, trigger reasoning checks, and view detailed analysis traces.' },
              { role: 'Hiring Manager', desc: 'Read-only access to final rankings and score summaries. Configure cluster weight sliders.' },
              { role: 'Administrator', desc: 'Full write access to YAML settings configs, ontology vocabularies, and system calibrations.' }
            ].map((roleObj, i) => (
              <div 
                key={i} 
                className="glass-panel" 
                onClick={() => onUpdateRole(roleObj.role)}
                style={{ 
                  padding: '20px', 
                  cursor: 'pointer', 
                  borderColor: user.role === roleObj.role ? 'var(--accent-primary)' : 'var(--border-light)',
                  background: user.role === roleObj.role ? 'var(--accent-primary-glow)' : 'var(--bg-glass)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '8px', color: user.role === roleObj.role ? '#fff' : 'var(--text-secondary)' }}>
                  {roleObj.role} {user.role === roleObj.role && '✓'}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{roleObj.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* API Credentials */}
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '12px' }}>System API Token</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Use this token to authenticate external webhooks or local rank triggers from CLI pipelines.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              readOnly 
              className="form-input" 
              style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: 'var(--bg-tertiary)', border: 'none' }}
              value="rc_live_948f93e981bd43a8c2f1f0ee3e891c94"
            />
            <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={() => alert('API Key copied to clipboard!')}>
              Copy Key
            </button>
          </div>
        </div>

        {/* Log Out */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn-danger" onClick={onLogout}>
            Disconnect Session
          </button>
        </div>
      </div>
    </div>
  );
}
