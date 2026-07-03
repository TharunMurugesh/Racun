import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function OntologySettings() {
  const [ontology, setOntology] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('ontology'); // 'ontology' | 'weights'

  // Load ontology and settings configuration files
  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const ontConfig = await api.getConfigFile('ontology');
      setOntology(ontConfig.content);

      const setConfig = await api.getConfigFile('settings');
      setSettings(setConfig.content);
    } catch (err) {
      setError('Failed to load configurations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleWeightChange = (category, key, val) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: val
      }
    }));
  };

  const handleSynonymChange = (concept, text) => {
    const list = text.split(',').map(s => s.trim()).filter(Boolean);
    setOntology(prev => ({
      ...prev,
      [concept]: list
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      if (activeSubTab === 'ontology') {
        await api.updateConfigFile('ontology', ontology);
        setSuccess('Ontology synonyms updated and pipeline re-run successfully.');
      } else {
        await api.updateConfigFile('settings', settings);
        setSuccess('Scoring weights and thresholds updated and pipeline re-run successfully.');
      }
      await loadConfig();
    } catch (err) {
      setError('Failed to save configuration: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '4px' }}>Ontology & <span className="gradient-text">Scoring Registry</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Calibrate the semantic synonyms ontology and the relative weight multipliers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '10px' }}>
        <button 
          className="btn-secondary" 
          onClick={() => setActiveSubTab('ontology')}
          style={{ 
            border: 'none', 
            background: activeSubTab === 'ontology' ? 'var(--bg-secondary)' : 'transparent',
            color: activeSubTab === 'ontology' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'ontology' ? '2px solid var(--accent-primary)' : 'none',
            borderRadius: '0',
            fontWeight: '600'
          }}
        >
          Concept Ontology Mapping
        </button>
        <button 
          className="btn-secondary" 
          onClick={() => setActiveSubTab('weights')}
          style={{ 
            border: 'none', 
            background: activeSubTab === 'weights' ? 'var(--bg-secondary)' : 'transparent',
            color: activeSubTab === 'weights' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'weights' ? '2px solid var(--accent-primary)' : 'none',
            borderRadius: '0',
            fontWeight: '600'
          }}
        >
          Scoring Rubrics & Weights
        </button>
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

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton" style={{ height: '120px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TAB: ONTOLOGY Synonyms Editor */}
          {activeSubTab === 'ontology' && ontology && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>Concept Synonym Editor</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
                Synonym mapping is the primary tool to handle candidate vocabulary variations. Add aliases or related terms (comma-separated) to automatically normalize evidence items into canonical concepts.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.keys(ontology).map(concept => (
                  <div key={concept} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem' }}>
                      {concept}
                    </div>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Add synonyms separated by commas..." 
                      defaultValue={ontology[concept].join(', ')}
                      onBlur={(e) => handleSynonymChange(concept, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: WEIGHTS Sliders */}
          {activeSubTab === 'weights' && settings && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Evidence Hierarchy */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Evidence Hierarchy Source Multipliers</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {Object.keys(settings.hierarchy_weights).map(key => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>{key} Weight</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{settings.hierarchy_weights[key].toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.0" 
                        step="0.05"
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        value={settings.hierarchy_weights[key]}
                        onChange={(e) => handleWeightChange('hierarchy_weights', key, parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Depth Level Weights */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Evidence Depth Level Weights</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* Skip L0 which must be 0.0 */}
                  {['L1', 'L2', 'L3'].map(key => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>{key} Weight</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{settings.depth_weights[key].toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.0" 
                        step="0.05"
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        value={settings.depth_weights[key]}
                        onChange={(e) => handleWeightChange('depth_weights', key, parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Satisfaction Base Scores */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>Satisfaction Base Scores</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {['SATISFIED', 'PARTIALLY_SATISFIED', 'WEAKLY_SATISFIED'].map(key => (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <span>{key.replace(/_/g, ' ')}</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{settings.satisfaction_scores[key].toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.0" 
                        step="0.05"
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        value={settings.satisfaction_scores[key]}
                        onChange={(e) => handleWeightChange('satisfaction_scores', key, parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Submit */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn-primary" 
              onClick={handleSave} 
              disabled={saving}
              style={{ padding: '12px 30px' }}
            >
              {saving ? 'Saving...' : 'Apply Registry Updates'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
