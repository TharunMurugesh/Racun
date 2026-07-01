import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function HoneypotCenter() {
  const [honeypots, setHoneypots] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.getHoneypots();
      setHoneypots(list);

      const config = await api.getConfigFile('settings');
      setSettings(config.content);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSliderChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      honeypot: {
        ...prev.honeypot,
        [key]: val
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await api.updateConfigFile('settings', settings);
      setSuccess('Honeypot rules updated and pipeline re-run successfully.');
      
      // Reload honeypot list
      const list = await api.getHoneypots();
      setHoneypots(list);
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getFlagExplanation = (flag) => {
    switch (flag) {
      case 'impossible_timeline': return 'Career history has simultaneous full-time job overlaps exceeding 3 months.';
      case 'skill_duration_overflow': return 'Sum of declared skill experience years exceeds total experience span by 1.5x.';
      case 'assessment_contradiction': return 'Declared "expert" in a skill but platform assessment score falls below 40%.';
      case 'experience_inflation': return 'Years of experience field exceeds actual career timeline duration by more than 2 years.';
      case 'unsupported_expert_cluster': return 'Claims expert skill ratings across multiple fields with zero career history evidence.';
      case 'phantom_regression': return 'Career role level drops implausibly (e.g. Lead CTO to Junior Frontend Intern).';
      default: return 'Contradictory candidate profile formatting.';
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '2rem', marginBottom: '4px' }}>Honeypot <span className="gradient-text">Fraud & Quality Control</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Screen out fraudulent resumes and impossible profile claims automatically.</p>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)', color: '#fca5a5' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '16px', background: 'var(--accent-teal-glow)', border: '1px solid var(--accent-teal)', borderRadius: 'var(--radius-sm)', color: '#99f6e4' }}>
          {success}
        </div>
      )}

      {/* Main split dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px' }}>
        
        {/* Rules Config Panel */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>Fraud Settings Calibration</h3>
          
          {loading || !settings ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="skeleton" style={{ height: '50px' }} />
              <div className="skeleton" style={{ height: '50px' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Disqualification Flag threshold */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <label style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Disqualification Flag Threshold</label>
                  <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{settings.honeypot.flag_threshold} Flags</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="4" 
                  step="1"
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  value={settings.honeypot.flag_threshold}
                  onChange={(e) => handleSliderChange('flag_threshold', parseInt(e.target.value))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disqualify candidates if they trigger this many flags.</span>
              </div>

              {/* Skill duration overflow ratio */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <label style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Skill Overflow Tolerance Ratio</label>
                  <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{settings.honeypot.skill_overflow_ratio}x</span>
                </div>
                <input 
                  type="range" 
                  min="1.0" 
                  max="3.0" 
                  step="0.1"
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  value={settings.honeypot.skill_overflow_ratio}
                  onChange={(e) => handleSliderChange('skill_overflow_ratio', parseFloat(e.target.value))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flag if sum of skill years exceeds total experience by this multiplier.</span>
              </div>

              {/* Expert assessment floor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <label style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Expert Assessment Floor Score</label>
                  <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{Math.round(settings.honeypot.expert_assessment_floor * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.10" 
                  max="0.80" 
                  step="0.05"
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  value={settings.honeypot.expert_assessment_floor}
                  onChange={(e) => handleSliderChange('expert_assessment_floor', parseFloat(e.target.value))}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flag if claimed "expert" scores below this on tests.</span>
              </div>

              <button 
                className="btn-primary" 
                onClick={saveSettings} 
                disabled={saving}
                style={{ padding: '14px', marginTop: '10px' }}
              >
                {saving ? 'Saving...' : 'Apply Calibration'}
              </button>
            </div>
          )}
        </div>

        {/* Flagged Candidates Panel */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
            Flagged Resumes ({honeypots.length})
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton" style={{ height: '80px' }} />
              <div className="skeleton" style={{ height: '80px' }} />
            </div>
          ) : honeypots.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No candidates flagged under current rules. Clean talent pool!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {honeypots.map((cand) => (
                <div key={cand.id} style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{cand.name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cand.id}</span>
                    </div>
                    <span className="badge badge-red">{cand.years_experience} yrs exp</span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                    "{cand.summary}"
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>Reason Flags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {cand.flags.map((flag, idx) => (
                        <div key={idx} style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                            {flag.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px', lineHeight: '1.2' }}>
                            {getFlagExplanation(flag)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
