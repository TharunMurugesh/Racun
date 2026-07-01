const API_BASE_URL = '/api';

export const api = {
  async getStatus() {
    const res = await fetch(`${API_BASE_URL}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async initializePipeline(reset = false) {
    const res = await fetch(`${API_BASE_URL}/initialize?reset=${reset}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to initialize pipeline');
    return res.json();
  },

  async getJobDescription() {
    const res = await fetch(`${API_BASE_URL}/job-description`);
    if (!res.ok) throw new Error('Failed to fetch job description');
    return res.json();
  },

  async updateJobDescription(content) {
    const res = await fetch(`${API_BASE_URL}/job-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to update job description');
    return res.json();
  },

  async getConfigFile(fileName) {
    const res = await fetch(`${API_BASE_URL}/config/${fileName}`);
    if (!res.ok) throw new Error(`Failed to fetch config ${fileName}`);
    return res.json();
  },

  async updateConfigFile(fileName, data) {
    const res = await fetch(`${API_BASE_URL}/config/${fileName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update config ${fileName}`);
    return res.json();
  },

  async getCandidates() {
    const res = await fetch(`${API_BASE_URL}/candidates`);
    if (!res.ok) throw new Error('Failed to fetch candidates');
    return res.json();
  },

  async runRanking() {
    const res = await fetch(`${API_BASE_URL}/rank`, {
      method: 'POST',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to run ranking pipeline');
    }
    return res.json();
  },

  async getRankingResults() {
    const res = await fetch(`${API_BASE_URL}/rank/results`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to fetch ranking results');
    }
    return res.json();
  },

  async getCandidateDetails(cid) {
    const res = await fetch(`${API_BASE_URL}/candidate/${cid}`);
    if (!res.ok) throw new Error(`Failed to fetch candidate details for ${cid}`);
    return res.json();
  },

  async getCandidateReasoning(cid) {
    const res = await fetch(`${API_BASE_URL}/candidate/${cid}/reasoning`);
    if (!res.ok) throw new Error(`Failed to fetch candidate reasoning for ${cid}`);
    return res.json();
  },

  async getHoneypots() {
    const res = await fetch(`${API_BASE_URL}/honeypots`);
    if (!res.ok) throw new Error('Failed to fetch honeypots');
    return res.json();
  },

  async getHoneypotIds() {
    const res = await fetch(`${API_BASE_URL}/honeypot-ids`);
    if (!res.ok) throw new Error('Failed to fetch honeypot ids');
    const data = await res.json();
    return data.ids || [];
  },

  async getMetrics() {
    const res = await fetch(`${API_BASE_URL}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  }
};
