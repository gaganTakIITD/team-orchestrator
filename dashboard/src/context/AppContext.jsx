import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AppContext = createContext();

export function AppProvider({ children }) {
    const [authUser, setAuthUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const [allGithubRepos, setAllGithubRepos] = useState([]);
    const [selectedRepoNames, setSelectedRepoNames] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

    useEffect(() => {
        let active = true;
        async function checkAuth() {
            try {
                const user = await api.getMe();
                if (active) setAuthUser(user);
            } finally {
                if (active) setIsAuthLoading(false);
            }
        }
        checkAuth();
        return () => { active = false; };
    }, []);

    const fetchSelectedRepos = useCallback(async () => {
        if (!authUser?.email) return;
        const data = await api.getSelectedRepos();
        const names = new Set((data.repos || []).map(r => r.repo_name));
        setSelectedRepoNames(names);
        setHasCompletedOnboarding(names.size > 0);
    }, [authUser]);

    const fetchProjects = useCallback(async () => {
        if (!authUser?.email) {
            setProjects([]);
            setSelectedProject(null);
            return;
        }

        setLoading(true);
        try {
            const selectedReposData = await api.getSelectedRepos();
            const repoFullNames = (selectedReposData?.repos || []).map(r => r.repo_full_name || (r.owner_login ? `${r.owner_login}/${r.repo_name}` : r.repo_name)).filter(Boolean);
            let localData = await api.getProjects(authUser.email, false, repoFullNames);
            if (!localData || localData.length === 0) {
                localData = await api.getProjects(authUser.email, true, repoFullNames);
            }
            const githubData = await api.getGithubRepos();
            const ghRepos = (githubData && githubData.repos) ? githubData.repos : [];
            setAllGithubRepos(ghRepos);

            const usedLocalIds = new Set();
            let mergedProjects = ghRepos.map(repo => {
                const fullName = repo.full_name || (repo.owner_login ? `${repo.owner_login}/${repo.name}` : null) || repo.name;
                const localProj = (localData || []).find(p =>
                    !usedLocalIds.has(p.project_id) &&
                    (p.repo_full_name === fullName || p.name === repo.name || p.project_id === repo.name || p.project_id === fullName)
                );
                if (localProj) {
                    usedLocalIds.add(localProj.project_id);
                    return { ...localProj, is_setup: true, html_url: repo.html_url, owner_login: repo.owner_login, full_name: fullName };
                }
                return {
                    project_id: fullName,
                    name: repo.name,
                    repo_path: repo.html_url,
                    html_url: repo.html_url,
                    is_setup: false,
                    commit_count: 0,
                    author_count: 0,
                    authors: [],
                    owner_login: repo.owner_login,
                    is_private: repo.private,
                    full_name: fullName,
                    registered_by: { email: repo.owner_login === authUser.login ? authUser.email : 'unknown' }
                };
            });

            (localData || []).forEach(localProj => {
                const alreadyExists = mergedProjects.find(p => p.project_id === localProj.project_id || p.name === localProj.name);
                if (!alreadyExists) {
                    mergedProjects.push({ ...localProj, is_setup: true, is_local_only: true });
                }
            });

            if (selectedRepoNames && selectedRepoNames.size > 0) {
                mergedProjects = mergedProjects.filter(p =>
                    p.is_local_only ||
                    selectedRepoNames.has(p.name) || selectedRepoNames.has(p.full_name)
                );
            }

            mergedProjects.sort((a, b) => {
                const aSetup = a.is_setup !== false ? 1 : 0;
                const bSetup = b.is_setup !== false ? 1 : 0;
                if (aSetup !== bSetup) return bSetup - aSetup;
                const aCommits = a.commit_count || 0;
                const bCommits = b.commit_count || 0;
                if (aCommits !== bCommits) return bCommits - aCommits;
                return a.name.localeCompare(b.name);
            });

            setProjects(mergedProjects);
            if (mergedProjects.length > 0) {
                if (!selectedProject || !mergedProjects.find(p => p.project_id === selectedProject.project_id)) {
                    setSelectedProject(mergedProjects[0]);
                }
            } else {
                setSelectedProject(null);
            }
        } finally {
            setLoading(false);
        }
    }, [authUser, selectedRepoNames]);

    useEffect(() => {
        if (!authUser) return;
        fetchSelectedRepos();
    }, [authUser, fetchSelectedRepos]);

    useEffect(() => {
        if (!authUser || selectedRepoNames === null) return;
        fetchProjects();
    }, [authUser, selectedRepoNames, fetchProjects]);

    useEffect(() => {
        let active = true;
        async function fetchStatus() {
            try {
                const data = await api.getStatus();
                if (active) setStatus(data);
            } catch (e) { /* ignore */ }
        }
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => { active = false; clearInterval(interval); };
    }, []);

    const logout = async () => {
        await api.logout();
        setAuthUser(null);
        setProjects([]);
        setSelectedProject(null);
        setSelectedRepoNames(null);
        setHasCompletedOnboarding(null);
    };

    const addRepos = async (repos) => {
        const result = await api.addSelectedRepos(repos);
        if (result) {
            await fetchSelectedRepos();
        }
        return result;
    };

    const removeRepo = async (repoName) => {
        const result = await api.removeSelectedRepo(repoName);
        if (result) {
            const newNames = new Set(selectedRepoNames);
            newNames.delete(repoName);
            setSelectedRepoNames(newNames);
            setHasCompletedOnboarding(newNames.size > 0);
        }
        return result;
    };

    const currentRole = React.useMemo(() => {
        if (!selectedProject || !authUser?.email) return 'User';
        return selectedProject.registered_by?.email === authUser.email ? 'Admin' : 'User';
    }, [selectedProject, authUser]);

    const value = {
        authUser, isAuthLoading, logout,
        currentRole, mode: currentRole,
        userEmail: authUser?.email || null,
        projects, allGithubRepos,
        selectedProject, setSelectedProject,
        selectedRepoNames, hasCompletedOnboarding,
        addRepos, removeRepo,
        status, loading,
        refreshProjects: fetchProjects,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    return useContext(AppContext);
}
