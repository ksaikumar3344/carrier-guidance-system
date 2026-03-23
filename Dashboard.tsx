import React, { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

interface Project {
  _id: string;
  projectName: string;
  description: string;
  githubRepo: string;
  status: string;
  teamMembers: any[];
}

interface Contributor {
  username: string;
  avatar: string;
  profileUrl: string;
  commitCount: number;
  linesAdded: number;
  linesDeleted: number;
  linesOfCode: number;
  lastActiveDate: string;
  daysSinceLastCommit: number;
  status: string;
}

interface Commit {
  id: string;
  author: string;
  timestamp: string;
  message: string;
  filesChanged: number;
  avatar?: string;
  url?: string;
}

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributorStats, setContributorStats] = useState<Contributor[]>([]);
  const [recentCommits, setRecentCommits] = useState<Commit[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const savedUser = localStorage.getItem('git_productivity_user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'user-role': user?.role || 'contributor',
    'user-email': user?.email || '',
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects || []);
        if (data.projects.length > 0) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async (project: Project) => {
    if (!project.githubRepo) {
      console.error('No GitHub repo specified for project:', project);
      setContributorStats([]);
      setRecentCommits([]);
      return;
    }
    
    try {
      setStatsLoading(true);
      const parts = project.githubRepo.split('/');
      
      if (parts.length !== 2) {
        console.error('Invalid GitHub repo format. Expected "owner/repo", got:', project.githubRepo);
        setContributorStats([]);
        setRecentCommits([]);
        return;
      }
      
      const [owner, repo] = parts;
      console.log('Fetching stats for:', { owner, repo, fullRepo: project.githubRepo });
      
      // Fetch contributors and commits
      const contributorsUrl = `${API_BASE_URL}/git/contributors?owner=${owner}&repo=${repo}`;
      const commitsUrl = `${API_BASE_URL}/git/commits?owner=${owner}&repo=${repo}`;
      
      console.log('Fetching from:', contributorsUrl);
      console.log('Fetching from:', commitsUrl);
      
      const [contributorsRes, commitsRes] = await Promise.all([
        fetch(contributorsUrl, { headers: getHeaders() }),
        fetch(commitsUrl, { headers: getHeaders() })
      ]);
      
      console.log('Contributors response status:', contributorsRes.status);
      console.log('Commits response status:', commitsRes.status);
      
      const contributors = await contributorsRes.json();
      const commits = await commitsRes.json();
      
      console.log('Contributors data:', contributors);
      console.log('Commits data:', commits);
      
      // Fix last commit dates by using actual commit data
      if (Array.isArray(contributors) && Array.isArray(commits)) {
        const updatedContributors = contributors.map(contributor => {
          // Find the most recent commit by this contributor
          const userCommits = commits.filter(commit => 
            commit.author?.toLowerCase() === contributor.username?.toLowerCase() ||
            commit.authorEmail?.toLowerCase().includes(contributor.username?.toLowerCase())
          );
          
          if (userCommits.length > 0) {
            // Get the most recent commit
            const lastCommit = userCommits[0]; // Commits are already sorted by date (newest first)
            const lastCommitDate = new Date(lastCommit.timestamp);
            const daysSince = Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Recalculate status based on actual days and commit count
            let status = 'Inactive';
            if (daysSince <= 7 && contributor.commitCount >= 5) {
              status = 'Active';
            } else if (daysSince <= 30 && contributor.commitCount >= 3) {
              status = 'Active';
            } else if (daysSince <= 60) {
              status = 'At Risk';
            }
            
            return {
              ...contributor,
              lastActiveDate: lastCommit.timestamp,
              daysSinceLastCommit: daysSince,
              status
            };
          }
          
          return contributor;
        });
        
        setContributorStats(updatedContributors);
      } else {
        setContributorStats(Array.isArray(contributors) ? contributors : []);
      }
      
      setRecentCommits(Array.isArray(commits) ? commits.slice(0, 10) : []);
    } catch (err) {
      console.error('Error fetching project stats:', err);
      setContributorStats([]);
      setRecentCommits([]);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectStats(selectedProject);
    }
  }, [selectedProject]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-folder fa-spin text-4xl text-indigo-600"></i>
          </div>
          <p className="text-slate-800 font-black text-xl mb-2">Loading Dashboard</p>
          <p className="text-slate-400 font-medium animate-pulse">Fetching projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-folder-open text-3xl text-slate-400"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">No Projects Available</h2>
          <p className="text-slate-500 leading-relaxed font-medium mb-8">
            {user?.role === 'admin' 
              ? 'Create your first project to get started'
              : 'No projects have been assigned to you yet. Contact your admin.'}
          </p>
          {user?.role === 'admin' && (
            <a
              href="/#/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
            >
              <i className="fas fa-plus"></i>
              Create Project
            </a>
          )}
        </div>
      </div>
    );
  }

  // Calculate stats
  const activeCount = contributorStats.filter(c => c.status === 'Active').length;
  const atRiskCount = contributorStats.filter(c => c.status === 'At Risk').length;
  const inactiveCount = contributorStats.filter(c => c.status === 'Inactive').length;
  const totalCommits = contributorStats.reduce((sum, c) => sum + (c.commitCount || 0), 0);
  const totalLOC = contributorStats.reduce((sum, c) => sum + (c.linesOfCode || 0), 0);

  // Calculate activity heatmap (commits by day of week)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const commitsByDay = [0, 0, 0, 0, 0, 0, 0];
  
  recentCommits.forEach(commit => {
    const date = new Date(commit.timestamp);
    const dayIndex = date.getDay();
    commitsByDay[dayIndex]++;
  });

  const activityHeatmap = dayNames.map((name, index) => ({
    day: name,
    commits: commitsByDay[index]
  }));

  const maxCommitsInDay = Math.max(...commitsByDay, 1);

  return (
    <div className="p-8 min-h-screen">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">Dashboard</h1>
          <p className="text-slate-500 font-medium">Team productivity and project analytics</p>
        </div>
        <button
          onClick={() => selectedProject && fetchProjectStats(selectedProject)}
          disabled={statsLoading}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt mr-2 ${statsLoading ? 'fa-spin' : ''}`}></i>
          Refresh
        </button>
      </header>

      {/* Project Selector */}
      <div className="mb-8 max-w-md">
        <label className="block text-sm font-bold text-slate-700 mb-3">
          <i className="fas fa-folder mr-2 text-indigo-600"></i>
          Select Project
        </label>
        <div className="relative">
          <select
            value={selectedProject?._id || ''}
            onChange={(e) => {
              const project = projects.find(p => p._id === e.target.value);
              setSelectedProject(project || null);
            }}
            className="w-full appearance-none px-4 py-4 pr-12 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm cursor-pointer"
          >
            <option value="">-- Select a project --</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.projectName} ({project.status})
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <i className="fas fa-chevron-down text-slate-400"></i>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          {projects.length} project{projects.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {selectedProject && (
        <>
          {/* Project Info Banner */}
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <i className="fab fa-github text-white"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-900">
                  Fetching data from: {selectedProject.githubRepo}
                </p>
                <p className="text-xs text-indigo-600">
                  {statsLoading ? 'Loading...' : `${contributorStats.length} contributors, ${recentCommits.length} recent commits`}
                </p>
              </div>
              {!statsLoading && contributorStats.length === 0 && (
                <div className="text-amber-600 text-sm font-medium">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  No data available - Check console for errors
                </div>
              )}
            </div>
          </div>

          {/* Repo Stats Banner */}
          <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black mb-1">{selectedProject.projectName}</h3>
                <p className="text-slate-400 text-sm">{selectedProject.githubRepo}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-black text-yellow-400">★</div>
                  <div className="text-xs text-slate-400 mt-1">Stars</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black">{totalCommits}</div>
                  <div className="text-xs text-slate-400 mt-1">Commits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black">{contributorStats.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Contributors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-emerald-400">{totalLOC.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mt-1">LOC</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-users text-indigo-600 text-lg"></i>
              </div>
              <p className="text-3xl font-black text-slate-800">{contributorStats.length}</p>
              <p className="text-slate-500 text-sm font-semibold mt-1">Contributors</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-circle-check text-emerald-600 text-lg"></i>
              </div>
              <p className="text-3xl font-black text-slate-800">{activeCount}</p>
              <p className="text-slate-500 text-sm font-semibold mt-1">Active</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-triangle-exclamation text-amber-600 text-lg"></i>
              </div>
              <p className="text-3xl font-black text-slate-800">{atRiskCount}</p>
              <p className="text-slate-500 text-sm font-semibold mt-1">At Risk</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-code-commit text-violet-600 text-lg"></i>
              </div>
              <p className="text-3xl font-black text-slate-800">{totalCommits}</p>
              <p className="text-slate-500 text-sm font-semibold mt-1">Total Commits</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <i className="fas fa-code text-blue-600 text-lg"></i>
              </div>
              <p className="text-3xl font-black text-slate-800">{totalLOC.toLocaleString()}</p>
              <p className="text-slate-500 text-sm font-semibold mt-1">Total LOC</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contributors Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <i className="fas fa-users text-indigo-500"></i>
                  Team Members
                </h2>
              </div>
              
              {statsLoading ? (
                <div className="p-12 text-center">
                  <i className="fas fa-spinner fa-spin text-3xl text-indigo-600 mb-4"></i>
                  <p className="text-slate-500 font-medium">Loading stats...</p>
                </div>
              ) : contributorStats.length === 0 ? (
                <div className="p-12 text-center">
                  <i className="fas fa-users text-3xl text-slate-300 mb-4"></i>
                  <p className="text-slate-500 font-medium">No contributor data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-6 py-3 text-xs font-black text-slate-600 uppercase">Member</th>
                        <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Commits</th>
                        <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">LOC</th>
                        <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Inactive</th>
                        <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Last Commit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributorStats.map((contributor, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={contributor.avatar} alt={contributor.username} className="w-8 h-8 rounded-full" />
                              <div>
                                <a 
                                  href={contributor.profileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-semibold text-slate-700 text-sm hover:text-indigo-600"
                                >
                                  {contributor.username}
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                              contributor.status === 'Active' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : contributor.status === 'At Risk'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {contributor.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800">{contributor.commitCount}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs">
                              <span className="text-emerald-600 font-bold">+{contributor.linesAdded}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-red-600 font-bold">-{contributor.linesDeleted}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`font-bold ${
                              contributor.daysSinceLastCommit > 7 
                                ? 'text-red-600' 
                                : contributor.daysSinceLastCommit > 3
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}>
                              {contributor.daysSinceLastCommit}d
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-slate-600 text-xs font-medium">
                              {contributor.lastActiveDate ? new Date(contributor.lastActiveDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Commits Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                  <i className="fas fa-code-branch text-purple-500"></i>
                  Recent Commits
                </h2>
              </div>
              
              {statsLoading ? (
                <div className="p-12 text-center">
                  <i className="fas fa-spinner fa-spin text-3xl text-purple-600 mb-4"></i>
                  <p className="text-slate-500 font-medium">Loading commits...</p>
                </div>
              ) : recentCommits.length === 0 ? (
                <div className="p-12 text-center">
                  <i className="fas fa-code-branch text-3xl text-slate-300 mb-4"></i>
                  <p className="text-slate-500 font-medium">No recent commits</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                  {recentCommits.map((commit, i) => (
                    <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {commit.avatar && (
                            <img src={commit.avatar} alt={commit.author} className="w-8 h-8 rounded-full shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{commit.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-slate-400 text-xs font-medium">{commit.author}</p>
                              {commit.url && (
                                <a 
                                  href={commit.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-indigo-500 hover:text-indigo-700 text-xs"
                                >
                                  <i className="fas fa-external-link"></i>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                            {commit.filesChanged} files
                          </span>
                          <p className="text-slate-400 text-xs mt-1">
                            {new Date(commit.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <i className="fas fa-fire text-orange-500"></i>
                Activity Heatmap
              </h2>
              <p className="text-xs text-slate-500 mt-1">Which days had most commits this week</p>
            </div>
            <div className="grid grid-cols-7 gap-4">
              {activityHeatmap.map((day, i) => {
                const intensity = day.commits / maxCommitsInDay;
                const bgColor = 
                  intensity === 0 ? 'bg-slate-100' :
                  intensity < 0.25 ? 'bg-emerald-200' :
                  intensity < 0.5 ? 'bg-emerald-400' :
                  intensity < 0.75 ? 'bg-emerald-600' :
                  'bg-emerald-700';
                
                return (
                  <div key={i} className="text-center">
                    <div 
                      className={`${bgColor} rounded-xl h-24 flex items-center justify-center mb-2 transition-all hover:scale-105 cursor-pointer`}
                      title={`${day.commits} commits`}
                    >
                      <span className={`text-2xl font-black ${intensity > 0.5 ? 'text-white' : 'text-slate-700'}`}>
                        {day.commits}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600">{day.day}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-slate-100 rounded"></div>
                <div className="w-4 h-4 bg-emerald-200 rounded"></div>
                <div className="w-4 h-4 bg-emerald-400 rounded"></div>
                <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                <div className="w-4 h-4 bg-emerald-700 rounded"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </>
      )}

      {!selectedProject && projects.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-hand-pointer text-3xl text-slate-400"></i>
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Select a Project</h3>
          <p className="text-slate-500 font-medium">
            Choose a project from the dropdown above to view analytics
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
