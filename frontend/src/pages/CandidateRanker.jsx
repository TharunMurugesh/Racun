import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import CandidateDetailDrawer from '../components/CandidateDetailDrawer';

export default function CandidateRanker() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState(0.0);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [showHoneypots, setShowHoneypots] = useState(true);
  const [honeypotIds, setHoneypotIds] = useState(new Set());

  const [rankingStatus, setRankingStatus] = useState(null);
  const [polling, setPolling] = useState(false);

  const fetchRankings = async (autoTrigger = false) => {
    setLoading(true);
    setError('');
    try {
      // Ensure preprocessing cache exists before any API calls
      const status = await api.getStatus();
      setRankingStatus(status.ranking);

      if (status.preprocessing?.is_running) {
        setError('Preprocessing is currently running. Please wait for it to finish on the Dashboard.');
        setLoading(false);
        return;
      }
      if (!status.cache_exists) {
        setError('No preprocessed cache found. Please go to the Dashboard and run Preprocessing first.');
        setLoading(false);
        return;
      }
      // The ranker only needs IDs for labeling/filtering; full honeypot
      // details are loaded in Honeypot Center.
      const hpIds = await api.getHoneypotIds();
      setHoneypotIds(new Set(hpIds));

      if (status.ranking?.is_running) {
        setPolling(true);
        return;
      }

      if (autoTrigger) {
        // Just fetch results of previous ranking
        try {
          const rankedData = await api.getRankingResults();
          setCandidates(Array.isArray(rankedData) ? rankedData : []);
        } catch (err) {
          setError('No ranking results found. Click "Recalculate & Rank" below to start the ranking pipeline.');
        }
      } else {
        // Trigger background ranking
        await api.runRanking();
        setPolling(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch rankings. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval = null;
    if (polling) {
      setLoading(true);
      interval = setInterval(async () => {
        try {
          const status = await api.getStatus();
          setRankingStatus(status.ranking);
          
          if (!status.ranking?.is_running) {
            clearInterval(interval);
            setPolling(false);
            setLoading(false);
            if (status.ranking?.error) {
              setError('Ranking failed: ' + status.ranking.error);
            } else {
              const rankedData = await api.getRankingResults();
              setCandidates(Array.isArray(rankedData) ? rankedData : []);
            }
          }
        } catch (err) {
          console.error("Failed to poll ranking status:", err);
          clearInterval(interval);
          setPolling(false);
          setLoading(false);
          setError('Lost connection to server during ranking.');
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling]);

  useEffect(() => {
    fetchRankings(true);
  }, []);

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cand.candidate_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore = cand.score >= minScore;
    
    const isHp = honeypotIds.has(cand.candidate_id);
    const matchesHoneypotFilter = showHoneypots || !isHp;

    return matchesSearch && matchesScore && matchesHoneypotFilter;
  });

  const getScoreBadgeColor = (score) => {
    if (score >= 0.7) return 'badge-emerald';
    if (score >= 0.4) return 'badge-amber';
    return 'badge-gray';
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '4px' }}>Candidate <span className="gradient-text">Rankings Console</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Thoroughly evaluate requirements satisfaction and evidence trustworthiness.</p>
        </div>
        <button className="btn-primary" onClick={() => fetchRankings(false)} disabled={loading}>
          {loading ? 'Re-running...' : 'Recalculate & Rank'}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div style={{ padding: '16px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fetchRankings(true)}>Force Preprocess & Rank</button>
        </div>
      )}

      {/* Filters Panel */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '2 1 240px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Search Candidates</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, ID, or keywords..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Score threshold */}
        <div style={{ flex: '1.5 1 200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Min Score Threshold</label>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-primary)' }}>{minScore.toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="0.0" 
            max="1.0" 
            step="0.05"
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            value={minScore}
            onChange={(e) => setMinScore(parseFloat(e.target.value))}
          />
        </div>

        {/* Honeypots Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '100%', paddingTop: '20px' }}>
          <input 
            type="checkbox" 
            id="showHoneypots" 
            checked={showHoneypots}
            onChange={(e) => setShowHoneypots(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
          />
          <label htmlFor="showHoneypots" style={{ fontSize: '0.85rem', fontWeight: '600', userSelect: 'none', cursor: 'pointer' }}>
            Include Blocklisted Honeypots
          </label>
        </div>
      </div>

      {/* Main Grid View */}
      {polling && rankingStatus ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
            Evaluating & Ranking <span className="gradient-text">Candidates</span>
          </div>
          <div style={{ width: '100%', maxWidth: '400px', height: '10px', background: 'var(--border-light)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
            <div style={{
              width: `${Math.round(((rankingStatus.processed_count || 0) / (rankingStatus.total_count || 1)) * 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              transition: 'width 0.4s ease-out'
            }} />
          </div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Processed <strong>{(rankingStatus.processed_count || 0).toLocaleString()}</strong> of <strong>{(rankingStatus.total_count || 0).toLocaleString()}</strong> candidates ({Math.round(((rankingStatus.processed_count || 0) / (rankingStatus.total_count || 1)) * 100)}%)
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px', lineHeight: '1.5' }}>
            This process correlates candidate evidence with job requirements and filters out honeypots. It runs asynchronously in the background.
          </p>
        </div>
      ) : loading ? (
        <div className="custom-table-wrapper" style={{ border: 'none' }}>
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="skeleton" style={{ height: '60px', marginBottom: '12px', borderRadius: '8px' }} />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <svg width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Candidates Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 20px' }}>
            There are no candidates matches for the current filters. Try relaxing the search or score constraints.
          </p>
        </div>
      ) : (
        <div className="custom-table-wrapper shadow-lg">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                <th>Candidate ID / Name</th>
                <th style={{ textAlign: 'center' }}>Final Score</th>
                <th style={{ textAlign: 'center' }}>Core Score</th>
                <th style={{ textAlign: 'center' }}>Gate Mod</th>
                <th style={{ textAlign: 'center' }}>Integrity Mod</th>
                <th>Evidence Match Reasoning</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((cand) => {
                const isHp = honeypotIds.has(cand.candidate_id);
                return (
                  <tr key={cand.candidate_id} style={{ opacity: isHp ? 0.6 : 1, background: isHp ? 'rgba(220,38,38,0.02)' : 'none' }}>
                    <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '1.1rem', color: isHp ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {isHp ? '—' : cand.rank}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{cand.name}</span>
                          {isHp && <span className="badge badge-red">Honeypot Flagged</span>}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{cand.candidate_id}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getScoreBadgeColor(cand.score)}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                        {isHp ? '0.0000' : cand.score.toFixed(4)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: '500' }}>
                      {cand.core_score.toFixed(4)}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                      <span style={{ color: cand.gate_modifier < 1.0 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                        {cand.gate_modifier.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                      <span style={{ color: cand.integrity_modifier < 1.0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {cand.integrity_modifier.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: '1.4' }}>
                      {cand.reason}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedCandidateId(cand.candidate_id)}
                      >
                        Audit Engine
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Candidate detail drawer */}
      {selectedCandidateId && (
        <CandidateDetailDrawer 
          candidateId={selectedCandidateId} 
          onClose={() => setSelectedCandidateId(null)}
        />
      )}
    </div>
  );
}
