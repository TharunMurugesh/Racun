import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function CandidateDetailDrawer({ candidateId, onClose }) {
  const [reasoning, setReasoning] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'profile' | 'math'
  const [expandedReq, setExpandedReq] = useState(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const reasoningData = await api.getCandidateReasoning(candidateId);
        setReasoning(reasoningData);

        const profileData = await api.getCandidateDetails(candidateId);
        setProfile(profileData);
      } catch (err) {
        setError('Failed to fetch detailed audit trail: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      loadDetails();
    }
  }, [candidateId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getSatisfactionColor = (sat) => {
    switch (sat) {
      case 'satisfied': return 'badge-emerald';
      case 'partially_satisfied': return 'badge-teal';
      case 'weakly_satisfied': return 'badge-amber';
      default: return 'badge-red';
    }
  };

  const formatSatisfaction = (sat) => {
    return sat.replace(/_/g, ' ').toUpperCase();
  };

  if (!candidateId) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      maxWidth: '650px',
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-medium)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {/* Header */}
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.5rem' }}>{loading ? 'Loading Audit Log...' : reasoning?.name}</h3>
            {reasoning?.is_honeypot && <span className="badge badge-red">Blocklisted</span>}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {candidateId}</span>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Tabs Selector */}
      {!loading && !error && (
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-light)' }}>
          {[
            { id: 'audit', label: 'Reasoning Trail' },
            { id: 'profile', label: 'Candidate Profile' },
            { id: 'math', label: 'Score Calculation' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '0.9rem',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : 'none',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton" style={{ height: '40px', width: '60%' }} />
            <div className="skeleton" style={{ height: '100px' }} />
            <div className="skeleton" style={{ height: '200px' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: '6px', color: '#fca5a5' }}>
            {error}
          </div>
        ) : (
          <>
            {/* TAB: AUDIT REASONING */}
            {activeTab === 'audit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Generated Explanation</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.6', fontStyle: 'italic' }}>
                    "{reasoning.explanation}"
                  </p>
                </div>

                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Requirement Match Audit</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reasoning.requirements.map((req, index) => {
                      const isExpanded = expandedReq === req.req_id;
                      return (
                        <div 
                          key={req.req_id}
                          className="glass-panel" 
                          style={{ 
                            padding: '16px', 
                            borderLeft: req.is_mandatory ? '3px solid var(--accent-primary)' : '1px solid var(--border-light)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setExpandedReq(isExpanded ? null : req.req_id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>{req.req_id}</span>
                                {req.is_mandatory && <span className="badge badge-purple" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Mandatory</span>}
                                <span className={`badge ${getSatisfactionColor(req.satisfaction)}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                  {formatSatisfaction(req.satisfaction)}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>{req.text}</p>
                            </div>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>

                          {isExpanded && (
                            <div className="animate-fade-in" style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()}>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px' }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Strength</div>
                                  <div style={{ fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' }}>{req.strength_score.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Consistency</div>
                                  <div style={{ fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' }}>{req.consistency_score.toFixed(4)}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Max Depth</div>
                                  <div style={{ fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' }}>L{req.max_depth}</div>
                                </div>
                              </div>

                              {req.best_evidence_text && (
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', marginBottom: '4px', textTransform: 'uppercase' }}>Strongest Evidence Source Snippet</div>
                                  <p style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', borderLeft: '2px solid var(--accent-teal)', color: 'var(--text-glow)', lineHeight: '1.4' }}>
                                    "{req.best_evidence_text}"
                                  </p>
                                </div>
                              )}

                              <div>
                                <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase' }}>Collected Evidence Matches ({req.collected.length})</div>
                                {req.collected.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)' }}>No evidence matches found.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {req.collected.map((ev, i) => (
                                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                          <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>Source: {ev.source}</span>
                                          {ev.duration_months && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{ev.duration_months} mo</span>}
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.3' }}>"{ev.raw_content}"</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <div style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase' }}>Validated Trust Evaluation ({req.validated.length})</div>
                                {req.validated.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)' }}>No validated evidence items.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {req.validated.map((val, i) => (
                                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Depth L{val.depth_level}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Trust: {val.trust_score.toFixed(2)}</span>
                                          </div>
                                          {val.flags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                              {val.flags.map((flg, fi) => (
                                                <span key={fi} className="badge badge-red" style={{ fontSize: '0.65rem' }}>{flg}</span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CANDIDATE PROFILE */}
            {activeTab === 'profile' && profile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '0.9rem' }}>
                {/* Summary */}
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Summary Bio</h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{profile.summary || 'No bio provided.'}</p>
                </div>

                {/* Experience Timeline */}
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Career History ({profile.years_experience} years total)</h4>
                  {profile.career_history.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No career history listed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {profile.career_history.map((job, idx) => (
                        <div key={idx} style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-medium)' }}>
                          <div style={{ position: 'absolute', top: '4px', left: '-6px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)', border: '2px solid var(--bg-secondary)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{job.role}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> @ {job.company}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px' }}>
                              {job.start_date} - {job.is_current ? 'Present' : job.end_date} ({job.duration_months} mo)
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>{job.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skills Grid */}
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Declared Skills & Proficiency</h4>
                  {profile.skills.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No skills listed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {profile.skills.map((skill, idx) => (
                        <div key={idx} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '6px 12px' }}>
                          <span style={{ fontWeight: '600' }}>{skill.name}</span>
                          {skill.years !== null && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({skill.years} yrs)</span>}
                          {skill.proficiency && (
                            <span className={`badge ${skill.proficiency === 'expert' ? 'badge-purple' : 'badge-gray'}`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                              {skill.proficiency}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assessments */}
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Redrob Platform Assessment Scores</h4>
                  {profile.assessments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No platform assessments taken.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {profile.assessments.map((asm, idx) => (
                        <div key={idx} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>{asm.skill}</span>
                          <span className="badge badge-teal" style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem' }}>
                            {Math.round(asm.score * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Other details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Education</h4>
                    {profile.education.map((ed, idx) => (
                      <div key={idx} style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: '700' }}>{ed.degree} in {ed.field}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{ed.institution} ({ed.year || 'N/A'})</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Languages</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {profile.languages.map((l, i) => <span key={i} className="badge badge-gray">{l}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SCORE CALCULATION */}
            {activeTab === 'math' && reasoning && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h4 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  Equation Breakdown
                </h4>

                {/* The equation visual */}
                <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.25rem', fontWeight: '800' }}>
                    <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Core Score</div>
                      <div style={{ fontFamily: 'monospace' }}>{reasoning.core_score.toFixed(4)}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>×</span>
                    <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderColor: reasoning.gate_modifier < 1.0 ? 'var(--accent-amber)' : 'var(--border-light)', borderStyle: 'solid', borderWidth: '1px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Gate Mod</div>
                      <div style={{ fontFamily: 'monospace', color: reasoning.gate_modifier < 1.0 ? 'var(--accent-amber)' : 'inherit' }}>{reasoning.gate_modifier.toFixed(2)}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>×</span>
                    <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px', borderColor: reasoning.integrity_modifier < 1.0 ? 'var(--accent-red)' : 'var(--border-light)', borderStyle: 'solid', borderWidth: '1px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Integrity Mod</div>
                      <div style={{ fontFamily: 'monospace', color: reasoning.integrity_modifier < 1.0 ? 'var(--accent-red)' : 'inherit' }}>{reasoning.integrity_modifier.toFixed(2)}</div>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>×</span>
                    <div style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Behavior Mod</div>
                      <div style={{ fontFamily: 'monospace' }}>{reasoning.behavior_modifier.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '1px', background: 'var(--border-light)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calculated Final Score</div>
                    <div className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
                      {reasoning.final_score.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Score Trace Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem' }}>
                  
                  {/* Core Score breakdown */}
                  <div>
                    <h5 style={{ fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Core Score Clusters (Weights sum to 100%)</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reasoning.clusters.map((c, i) => (
                        <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-light)' }}>
                          <div>
                            <span style={{ fontWeight: '600' }}>{c.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> (weight: {Math.round(c.weight * 100)}%)</span>
                          </div>
                          <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{c.score.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gate Modifier Explanation */}
                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Gate modifier threshold</h5>
                      <span className="badge badge-purple" style={{ fontFamily: 'monospace' }}>Modifier: {reasoning.gate_modifier.toFixed(2)}x</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Calculated from satisfying mandatory requirements. If all mandatory requirements are satisfied, modifier is 1.0. 
                      Partial or weak satisfaction results in multipliers of 0.75 or 0.55. Any missing mandatory requirement clips score immediately by 0.40.
                    </p>
                  </div>

                  {/* Integrity Modifier Explanation */}
                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Integrity Check Multipliers</h5>
                      <span className={`badge ${reasoning.integrity_modifier < 1.0 ? 'badge-red' : 'badge-teal'}`} style={{ fontFamily: 'monospace' }}>
                        Modifier: {reasoning.integrity_modifier.toFixed(2)}x
                      </span>
                    </div>
                    {reasoning.is_honeypot ? (
                      <p style={{ color: 'var(--accent-red)', fontWeight: '600', lineHeight: '1.4' }}>
                        🚨 Candidate failed honeypot criteria. Flags raised: {reasoning.honeypot_flags.join(', ') || 'None'}. Excluded from ranking list.
                      </p>
                    ) : reasoning.integrity_modifier < 1.0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          Violations flagged. Each flag applies a -10% modifier penalty (floor 0.60x):
                        </p>
                        <ul style={{ paddingLeft: '16px', color: 'var(--accent-red)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* Parse soft matching flags */}
                          {reasoning.honeypot_flags.map((f, idx) => <li key={idx}>Flagged: {f}</li>)}
                          <li>Timeline overlap or experience verification discrepancy detected.</li>
                        </ul>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        No internal contradictions or timeline discrepancies flagged. No penalties applied.
                      </p>
                    )}
                  </div>

                  {/* Behavioral Modifier Explanation */}
                  <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Behavioral Modifier (Redrob Signals)</h5>
                      <span className="badge badge-gray" style={{ fontFamily: 'monospace' }}>Modifier: {reasoning.behavior_modifier.toFixed(2)}x</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Calculated from the 23 behavioral platform signals (engagement, completeness, etc.). 
                      Currently returning 1.0 placeholder as behavioral signal definitions are locked in the backend specification.
                    </p>
                  </div>

                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
