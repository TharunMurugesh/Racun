import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import CandidateDetailDrawer from '../components/CandidateDetailDrawer';

const stageLabels = {
  idle: 'Ready',
  preprocessing: 'Preprocessing candidates',
  ranking: 'Ranking candidates',
  complete: 'Complete',
  failed: 'Failed',
};

export default function CandidateRanker({ addToast }) {
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [running, setRunning] = useState(false);
  const [loadingResults, setLoadingResults] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async () => {
    try {
      const data = await api.getRankingResults();
      setCandidates(Array.isArray(data) ? data.slice(0, 100) : []);
      setError('');
    } catch {
      setCandidates([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const refreshStatus = async () => {
    const nextStatus = await api.getStatus();
    setStatus(nextStatus);
    const isRunning = Boolean(nextStatus.pipeline?.is_running || nextStatus.preprocessing?.is_running || nextStatus.ranking?.is_running);
    setRunning(isRunning);
    return nextStatus;
  };

  const eraseCache = async () => {
    setError('');
    try {
      await api.clearCache();
      setCandidates([]);
      setSelectedCandidateId(null);
      setStatus((current) => ({
        ...current,
        cache_exists: false,
        requirements_count: 0,
        candidates_count: 0,
        honeypots_count: 0,
        pipeline: { is_running: false, stage: 'idle', error: null },
        preprocessing: { is_running: false, processed_count: 0, total_count: 0, error: null },
        ranking: { is_running: false, processed_count: 0, total_count: 0, error: null },
      }));
      addToast?.('Cache erased', 'success');
    } catch (err) {
      setError(err.message || 'Could not erase cache.');
      addToast?.('Cache erase failed', 'error');
    }
  };

  const startPipeline = async () => {
    setError('');
    setCandidates([]);
    setSelectedCandidateId(null);
    setRunning(true);
    setLoadingResults(false);
    try {
      await api.startPipeline();
      addToast?.('Pipeline started', 'success');
      await refreshStatus();
    } catch (err) {
      setRunning(false);
      setError(err.message || 'Could not start the pipeline.');
      addToast?.('Pipeline could not start', 'error');
    }
  };

  useEffect(() => {
    refreshStatus().then(loadResults).catch(() => {
      setLoadingResults(false);
      setError('Backend is not reachable. Start the API server and try again.');
    });
  }, []);

  useEffect(() => {
    if (!running) return undefined;

    const interval = setInterval(async () => {
      try {
        const nextStatus = await refreshStatus();
        if (!nextStatus.pipeline?.is_running && !nextStatus.preprocessing?.is_running && !nextStatus.ranking?.is_running) {
          clearInterval(interval);
          setRunning(false);
          if (nextStatus.pipeline?.error || nextStatus.preprocessing?.error || nextStatus.ranking?.error) {
            setError(nextStatus.pipeline?.error || nextStatus.preprocessing?.error || nextStatus.ranking?.error);
            addToast?.('Pipeline failed', 'error');
          } else {
            await loadResults();
            addToast?.('Pipeline complete', 'success');
          }
        }
      } catch {
        clearInterval(interval);
        setRunning(false);
        setError('Connection was lost while the pipeline was running.');
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [running]);

  const progress = useMemo(() => {
    if (!status) return 0;
    const active = status.pipeline?.stage === 'preprocessing' ? status.preprocessing : status.ranking;
    const processed = active?.processed_count || 0;
    const total = active?.total_count || 0;
    return total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : running ? 8 : 0;
  }, [status, running]);

  const stage = status?.pipeline?.stage || (running ? 'ranking' : 'idle');
  const csvReady = candidates.length > 0 && !running;

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '18px', alignItems: 'center' }}>
        <div style={{ minWidth: 260 }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Candidate Ranking Pipeline</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>One click runs preprocessing, ranking, and produces the final evaluation CSV.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {csvReady && (
            <a className="btn-secondary" href={api.getCsvUrl()} target="_blank" rel="noreferrer">
              Open CSV
            </a>
          )}
          <button className="btn-danger" onClick={eraseCache} disabled={running}>
            Erase Cache
          </button>
          <button className="btn-primary" onClick={startPipeline} disabled={running}>
            {running ? 'Running...' : 'Start'}
          </button>
        </div>
      </div>

      {(running || status?.pipeline?.stage === 'complete') && (
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{stageLabels[stage] || 'Working'}</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{progress}%</span>
          </div>
          <div style={{ height: 10, background: 'var(--bg-tertiary)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            <div style={{ width: progress + '%', height: '100%', background: 'linear-gradient(90deg, var(--accent-teal), var(--accent-primary))', transition: 'width 0.35s ease' }} />
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 16px', background: 'var(--accent-red-glow)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem' }}>Top 100 Candidates</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Click a panel to see the ranking reason and contact details.</p>
        </div>
        {csvReady && <span className="badge badge-teal">CSV ready</span>}
      </div>

      {loadingResults ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[...Array(6)].map((_, index) => <div key={index} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : candidates.length === 0 && !running ? (
        <div className="glass-panel" style={{ padding: '56px 20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>No ranked candidates yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Click Start to run the full pipeline and generate the evaluation list.</p>
        </div>
      ) : (
        <div className="candidate-panel-grid">
          {candidates.map((candidate) => (
            <button key={candidate.candidate_id} className="candidate-panel" onClick={() => setSelectedCandidateId(candidate.candidate_id)}>
              <div className="candidate-panel-rank">#{candidate.rank}</div>
              <div className="candidate-panel-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="candidate-panel-name">{candidate.name || candidate.candidate_id}</div>
                    <div className="candidate-panel-id">{candidate.candidate_id}</div>
                  </div>
                  <span className="badge badge-emerald" style={{ fontFamily: 'monospace', flexShrink: 0 }}>{Number(candidate.score).toFixed(4)}</span>
                </div>
                <p className="candidate-panel-reason">{candidate.reason}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCandidateId && (
        <CandidateDetailDrawer candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} />
      )}
    </div>
  );
}
