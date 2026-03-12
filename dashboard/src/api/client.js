import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
});

export { client };

export const api = {
  client,
  getProjects: async (email) => {
    try {
      const res = await client.get('/projects', { params: { email } });
      return res.data;
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  getProjectResults: async (projectId) => {
    try {
      const res = await client.get(`/projects/${projectId}/results`);
      return res.data;
    } catch (e) {
      if (e.response?.status !== 404) console.error(e);
      return [];
    }
  },
  getProjectCommits: async (projectId) => {
    try {
      const res = await client.get(`/projects/${projectId}/commits`);
      return res.data;
    } catch (e) {
      if (e.response?.status !== 404) console.error(e);
      return [];
    }
  },
  getProjectInsights: async (projectId) => {
    try {
      const res = await client.get(`/projects/${projectId}/insights`);
      return res.data;
    } catch (e) {
      if (e.response?.status !== 404) console.error(e);
      return null;
    }
  },
  getPeerMatrix: async (projectId) => {
    try {
      const res = await client.get(`/projects/${projectId}/peer-matrix`);
      return res.data;
    } catch (e) {
      if (e.response?.status !== 404) console.error(e);
      return [];
    }
  },
  getProjectComments: async (projectId) => {
    try {
      const res = await client.get(`/projects/${projectId}/comments`);
      return res.data;
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createProjectComment: async (projectId, targetEmail, content) => {
    try {
      const res = await client.post(`/projects/${projectId}/comments`, {
        target_email: targetEmail,
        content: content
      });
      return res.data;
    } catch (e) {
      console.error(e);
      throw e;
    }
  },
  getStatus: async () => {
    try {
      const res = await client.get('/status');
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  askQuestion: async (question) => {
    try {
      const res = await client.post('/query', { question });
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  // Authentication methods
  getMe: async () => {
    try {
      const res = await client.get('/auth/me');
      return res.data;
    } catch (e) {
      return null; // Not authenticated or expired
    }
  },
  getGithubRepos: async () => {
    try {
      const res = await client.get('/auth/github/repos');
      return res.data;
    } catch (e) {
      console.error(e);
      return { repos: [] };
    }
  },
  logout: async () => {
    try {
      await client.post('/auth/logout');
      return true;
    } catch (e) {
      return false;
    }
  },

  getSelectedRepos: async () => {
    try {
      const res = await client.get('/auth/repos/selected');
      return res.data;
    } catch (e) {
      return { repos: [], count: 0 };
    }
  },
  addSelectedRepos: async (repos) => {
    try {
      const res = await client.post('/auth/repos/selected', { repos });
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  removeSelectedRepo: async (repoName) => {
    try {
      const res = await client.delete(`/auth/repos/selected/${encodeURIComponent(repoName)}`);
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
};
