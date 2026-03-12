import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(),
  };
  mockClient.create.mockReturnValue(mockClient);
  return { default: mockClient };
});

describe('API Client', () => {
  let api;
  let axios;

  beforeEach(async () => {
    vi.resetModules();
    axios = (await import('axios')).default;
    const mod = await import('../../api/client');
    api = mod.api;
  });

  describe('getProjects', () => {
    it('returns data on success', async () => {
      axios.get.mockResolvedValueOnce({ data: [{ name: 'repo1' }] });
      const result = await api.getProjects('test@email.com');
      expect(result).toEqual([{ name: 'repo1' }]);
    });

    it('returns empty array on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('fail'));
      const result = await api.getProjects('test@email.com');
      expect(result).toEqual([]);
    });
  });

  describe('getProjectResults', () => {
    it('returns data on success', async () => {
      axios.get.mockResolvedValueOnce({ data: [{ email: 'a@b.com', composite_score: 4.2 }] });
      const result = await api.getProjectResults('proj-1');
      expect(result).toEqual([{ email: 'a@b.com', composite_score: 4.2 }]);
    });

    it('returns empty array on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('fail'));
      const result = await api.getProjectResults('proj-1');
      expect(result).toEqual([]);
    });
  });

  describe('getProjectCommits', () => {
    it('returns data on success', async () => {
      axios.get.mockResolvedValueOnce({ data: [{ sha: 'abc123' }] });
      const result = await api.getProjectCommits('proj-1');
      expect(result).toEqual([{ sha: 'abc123' }]);
    });
  });

  describe('getProjectInsights', () => {
    it('returns null on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('fail'));
      const result = await api.getProjectInsights('proj-1');
      expect(result).toBeNull();
    });
  });

  describe('askQuestion', () => {
    it('returns data on success', async () => {
      axios.post.mockResolvedValueOnce({ data: { answer: 'Test answer' } });
      const result = await api.askQuestion('Who writes the most?');
      expect(result).toEqual({ answer: 'Test answer' });
    });

    it('returns null on error', async () => {
      axios.post.mockRejectedValueOnce(new Error('fail'));
      const result = await api.askQuestion('question');
      expect(result).toBeNull();
    });
  });

  describe('getMe', () => {
    it('returns user data on success', async () => {
      axios.get.mockResolvedValueOnce({ data: { email: 'user@test.com', name: 'User' } });
      const result = await api.getMe();
      expect(result).toEqual({ email: 'user@test.com', name: 'User' });
    });

    it('returns null if not authenticated', async () => {
      axios.get.mockRejectedValueOnce(new Error('401'));
      const result = await api.getMe();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('returns true on success', async () => {
      axios.post.mockResolvedValueOnce({});
      const result = await api.logout();
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      axios.post.mockRejectedValueOnce(new Error('fail'));
      const result = await api.logout();
      expect(result).toBe(false);
    });
  });

  describe('createProjectComment', () => {
    it('returns created comment', async () => {
      axios.post.mockResolvedValueOnce({ data: { id: 1, content: 'Great work!' } });
      const result = await api.createProjectComment('proj-1', 'target@test.com', 'Great work!');
      expect(result).toEqual({ id: 1, content: 'Great work!' });
    });

    it('throws on error', async () => {
      axios.post.mockRejectedValueOnce(new Error('fail'));
      await expect(api.createProjectComment('proj-1', 'x@y.com', 'hi')).rejects.toThrow();
    });
  });

  describe('getGithubRepos', () => {
    it('returns repos list on success', async () => {
      axios.get.mockResolvedValueOnce({ data: { repos: [{ name: 'repo1' }] } });
      const result = await api.getGithubRepos();
      expect(result.repos).toHaveLength(1);
    });

    it('returns empty repos on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('fail'));
      const result = await api.getGithubRepos();
      expect(result.repos).toEqual([]);
    });
  });
});
