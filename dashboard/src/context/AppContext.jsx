import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AppContext = createContext();

export function AppProvider({ children }) {
    const [authUser, setAuthUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // Initial Auth Check
    useEffect(() => {
        let active = true;
        async function checkAuth() {
            try {
                const user = await api.getMe();
                if (active) {
                    setAuthUser(user);
                }
            } finally {
                if (active) setIsAuthLoading(false);
            }
        }
        checkAuth();
        return () => { active = false; };
    }, []);

    // Fetch projects effect (only if authenticated)
    useEffect(() => {
        if (!authUser) return; // Don't fetch if not logged in

        let active = true;
        async function fetchProjects() {
            setLoading(true);
            try {
                if (!authUser || !authUser.email) {
                    setProjects([]);
                    setSelectedProject(null);
                    return;
                }

                // 1. Fetch analyzed projects from local backend
                const localData = await api.getProjects(authUser.email);
                
                // 2. Fetch raw remote GitHub repos using OAuth token
                const githubData = await api.getGithubRepos();
                const ghRepos = (githubData && githubData.repos) ? githubData.repos : [];

                // 3. Merge them. Start with GitHub repos
                const mergedProjects = ghRepos.map(repo => {
                    const localProj = (localData || []).find(p => p.name === repo.name || p.project_id === repo.name);
                    if (localProj) {
                        return { ...localProj, is_setup: true, html_url: repo.html_url };
                    }
                    // Setup required for this repo
                    return {
                        project_id: repo.name,
                        name: repo.name,
                        repo_path: repo.html_url,
                        is_setup: false,
                        commit_count: 0,
                        authors: [],
                        registered_by: { email: repo.owner_login === authUser.login ? authUser.email : 'unknown' } 
                    };
                });

                // 4. Append any local projects that didn't match a GitHub repo
                (localData || []).forEach(localProj => {
                    const alreadyExists = mergedProjects.find(p => p.project_id === localProj.project_id || p.name === localProj.name);
                    if (!alreadyExists) {
                        mergedProjects.push({ ...localProj, is_setup: true, is_local_only: true });
                    }
                });

                if (active) {
                    setProjects(mergedProjects);
                    // Auto-select first project if none selected or if selected is no longer in list
                    if (mergedProjects.length > 0) {
                        if (!selectedProject || !mergedProjects.find(p => p.project_id === selectedProject.project_id)) {
                            setSelectedProject(mergedProjects[0]);
                        }
                    } else {
                        setSelectedProject(null);
                    }
                }
            } finally {
                if (active) setLoading(false);
            }
        }
        fetchProjects();
        return () => { active = false; };
    }, [authUser]);

    // Fetch status effect
    useEffect(() => {
        let active = true;
        async function fetchStatus() {
            try {
                const data = await api.getStatus();
                if (active) setStatus(data);
            } catch (e) {
                // ignore
            }
        }
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // refresh status every 5s
        return () => { active = false; clearInterval(interval); };
    }, []);

    const logout = async () => {
        await api.logout();
        setAuthUser(null);
        setProjects([]);
        setSelectedProject(null);
        // Page redirect will be handled transparently by AppRouter when authUser becomes null
    };

    const currentRole = React.useMemo(() => {
        if (!selectedProject || !authUser?.email) return 'User';
        return selectedProject.registered_by?.email === authUser.email ? 'Admin' : 'User';
    }, [selectedProject, authUser]);

    const value = {
        authUser, isAuthLoading, logout,
        currentRole, mode: currentRole, // mapping mode to currentRole for backwards compatibility in other files briefly
        projects,
        selectedProject, setSelectedProject,
        status,
        loading
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
    return useContext(AppContext);
}
