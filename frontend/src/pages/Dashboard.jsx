import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard({ onNavigate, addToast }) {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [loadingRank, setLoadingRank] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchDashboardData = async () => {
    try {
      setError('');
      const statusData = await api.getStatus();
      setStatus(statusData);
      
      if (statusData.preprocessing?.is_running) {
        setLoadingPrep(true);
      } else {
        setLoadingPrep(false);
      }
      
      if (statusData.ranking?.is_running) {
        setLoadingRank(true);
      } else {
        setLoadingRank(false);
      }
      
      const metricsData = await api.getMetrics();
      setMetrics(metricsData);
    } catch (err) {
      setError('Failed to connect to backend server. Make sure the FastAPI app is running on port 8000.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    let interval = null;
    if (status?.preprocessing?.is_running) {
      interval = setInterval(async () => {
        try {
          const statusData = await api.getStatus();
          setStatus(statusData);
          if (!statusData.preprocessing?.is_running) {
            clearInterval(interval);
            setLoadingPrep(false);
            setSuccessMsg('Preprocessing pipeline executed successfully. Cache rebuilt.');
            const metricsData = await api.getMetrics();
            setMetrics(metricsData);
          }
        } catch (err) {
          console.error("Failed to poll status:", err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.preprocessing?.is_running]);

  // Polling for ranking progress
  useEffect(() => {
    let interval = null;
    if (status?.ranking?.is_running) {
      interval = setInterval(async () => {
        try {
          const statusData = await api.getStatus();
          setStatus(statusData);
          if (!statusData.ranking?.is_running) {
            clearInterval(interval);
            setLoadingRank(false);
            if (statusData.ranking?.error) {
              setError('Ranking failed: ' + statusData.ranking.error);
            } else {
              setSuccessMsg('Ranking pipeline executed successfully. submission.csv generated.');
            }
            const metricsData = await api.getMetrics();
            setMetrics(metricsData);
          }
        } catch (err) {
          console.error("Failed to poll ranking status:", err);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.ranking?.is_running]);

  const handlePreprocess = async () => {
    setLoadingPrep(true);
    setSuccessMsg('');
    setError('');
    try {
      await api.initializePipeline(true);
      await fetchDashboardData();
    } catch (err) {
      setError('Preprocessing failed: ' + err.message);
      setLoadingPrep(false);
    }
  };

  const handleRanking = async () => {
    setLoadingRank(true);
    setSuccessMsg('');
    setError('');
    try {
      await api.runRanking();
      await fetchDashboardData();
    } catch (err) {
      setError('Ranking failed: ' + err.message);
      setLoadingRank(false);
    }
  };

  // Safe variables for SVG graphs
  const scoreDist = metrics?.score_distribution || [];
  const maxBinCount = scoreDist.length > 0 ? Math.max(...scoreDist.map(b => b.count), 1) : 1;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '4px' }}>System <span className="gradient-text">Overview & Controls</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Real-time statistics and execution panels for RACUN reasoning pipelines.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={fetchDashboardData}>Refresh Data</button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
          <span style={{ fontSize: '0.9rem' }}>{error}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '16px', background: 'var(--accent-teal-glow)', border: '1px solid var(--accent-teal)', borderRadius: 'var(--radius-sm)', color: '#99f6e4', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span style={{ fontSize: '0.9rem' }}>{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Preprocessed</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
            {status?.preprocessing?.total_count && status?.preprocessing?.total_count > 0 ? (
              <span style={{ fontSize: '1.8rem' }}>
                {(status.preprocessing.processed_count || 0).toLocaleString()} / {(status.preprocessing.total_count || 0).toLocaleString()}
              </span>
            ) : (
              (status?.candidates_count || 0).toLocaleString()
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {status?.preprocessing?.is_running ? 'Extracting & normalizing evidence...' : 'Candidates in memory cache'}
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Honeypots Blocklisted</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--accent-red)' }}>{status?.honeypots_count || 0}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Excluded from scoring system</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Mean Calibrated Score</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>{metrics?.mean_score || '0.000'}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Target: 0.25 - 0.45</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Standard Deviation</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>{metrics?.std_deviation || '0.000'}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Discrimination index target: &gt;0.15</p>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px' }}>
        
        {/* Execution Card */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>Pipeline Orchestrator</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Run the localized preprocessing and correlation workflows. Preprocessing extracts and caches normalized evidence. Ranking correlates evidence against requirements and outputs top matches.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '10px' }}>
            <button 
              className="btn-secondary" 
              onClick={handlePreprocess} 
              disabled={loadingPrep || loadingRank}
              style={{ flex: 1, padding: '14px', whiteSpace: 'nowrap' }}
            >
              {loadingPrep ? (
                status?.preprocessing?.is_running ? (
                  `Processing (${Math.round(((status.preprocessing.processed_count || 0) / (status.preprocessing.total_count || 1)) * 100)}%)`
                ) : 'Processing...'
              ) : 'Run Preprocessing'}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleRanking} 
              disabled={loadingPrep || loadingRank}
              style={{ flex: 1, padding: '14px', whiteSpace: 'nowrap' }}
            >
              {loadingRank ? (
                status?.ranking?.is_running ? (
                  `Ranking (${Math.round(((status.ranking.processed_count || 0) / (status.ranking.total_count || 1)) * 100)}%)`
                ) : 'Starting...'
              ) : 'Run Ranking'}
            </button>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cache Status:</span>
              <span className={`badge ${status?.cache_exists ? 'badge-teal' : 'badge-amber'}`}>
                {status?.cache_exists ? 'Cached' : 'Missing Cache'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Last Submission Output:</span>
              <span className={`badge ${metrics?.ranking_completed ? 'badge-emerald' : 'badge-gray'}`}>
                {metrics?.ranking_completed ? 'Generated (submission.csv)' : 'Not Ran'}
              </span>
            </div>
          </div>
        </div>

        {/* Score Distribution Chart */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>Score Calibration Distribution</h3>
          {scoreDist.length === 0 ? (
            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No distribution data. Please run ranking first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* SVG Histogram */}
              <svg width="100%" height="160" viewBox="0 0 400 160" style={{ overflow: 'visible' }}>
                {scoreDist.map((bin, i) => {
                  const barHeight = (bin.count / maxBinCount) * 120;
                  const x = i * 40;
                  const y = 140 - barHeight;
                  return (
                    <g key={i} className="histogram-bar">
                      <rect 
                        x={x + 2} 
                        y={y} 
                        width="36" 
                        height={barHeight} 
                        fill="url(#barGradient)" 
                        rx="4"
                      />
                      <text 
                        x={x + 20} 
                        y={y - 6} 
                        textAnchor="middle" 
                        fill="var(--text-primary)" 
                        fontSize="9" 
                        fontWeight="600"
                      >
                        {bin.count > 0 ? bin.count : ''}
                      </text>
                      <text 
                        x={x + 20} 
                        y="155" 
                        textAnchor="middle" 
                        fill="var(--text-muted)" 
                        fontSize="9"
                      >
                        {bin.bin_start.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--accent-secondary)" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="140" x2="400" y2="140" stroke="var(--border-medium)" strokeWidth="1" />
              </svg>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
                Calibrated bins representing candidate count per score interval.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Analysis & Quick Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px' }}>
        
        {/* Cluster breakdown card */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '20px' }}>Clusters Definitions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { id: 'core_ai_ml', name: 'Core AI/ML Engineering', weight: '40%', reqs: '4 requirements' },
              { id: 'applied_llm', name: 'Applied LLM and Generative AI', weight: '30%', reqs: '3 requirements' },
              { id: 'engineering_practices', name: 'Engineering Practices & Infrastructure', weight: '20%', reqs: '2 requirements' },
              { id: 'domain_experience', name: 'Domain and Industry Experience', weight: '10%', reqs: '1 requirement' }
            ].map((cl, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{cl.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cl.reqs}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>{cl.weight} Weight</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '4px' }}>Quick Navigation</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', flex: 1 }}>
            <div className="glass-panel" onClick={() => onNavigate('ranker')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--accent-primary)' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>Rank List</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Browse evaluated talent matches</div>
              </div>
            </div>

            <div className="glass-panel" onClick={() => onNavigate('honeypots')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--accent-red)' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>Honeypot Audit</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspect flagged profiles</div>
              </div>
            </div>

            <div className="glass-panel" onClick={() => onNavigate('ontology')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--accent-teal)' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.297 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>Ontology & Rules</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibrate weights and thresholds</div>
              </div>
            </div>

            <div className="glass-panel" onClick={() => onNavigate('profile')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.767.253.553.876.83 1.43.53l1.105-.6a1.5 1.5 0 011.905.35l1.492 1.74a1.5 1.5 0 002.24.04l2.23-2.23a1.5 1.5 0 00.04-2.24l-1.74-1.492a1.5 1.5 0 01-.35-1.905l.6-1.105c.3-.554.023-1.177-.53-1.43a15.58 15.58 0 00-2.766-.985m0 9.18a15.59 15.59 0 01-2.767-.985M15.58 8.44a15.59 15.59 0 00-2.766-.985m0 0A15.58 15.58 0 0115.58 6M12 12h.008v.008H12V12z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>Pipeline Config</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Adjust server parameters</div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
