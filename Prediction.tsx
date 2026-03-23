import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE_URL = 'http://localhost:5000/api';

interface Project {
  _id: string;
  projectName: string;
  githubRepo: string;
}

interface Contributor {
  username: string;
  avatar: string;
  commitCount: number;
  linesOfCode: number;
  linesAdded: number;
  linesDeleted: number;
  status: string;
  daysSinceLastCommit: number;
  lastActiveDate: string;
}

interface MLPrediction {
  contributor: string;
  status: string;
  confidence: number;
  reason: string;
  commitCount: number;
  linesOfCode: number;
  inactiveDays: number;
  latency: number;
}

const Prediction: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const savedUser = localStorage.getItem('git_productivity_user');
  const user = savedUser ? JSON.parse(savedUser) : null;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'user-role': user?.role || 'contributor',
    'user-email': user?.email || '',
  });

  const fetchProjects = async () => {
    try {
      const response = await fetch(${API_BASE_URL}/projects, { headers: getHeaders() });
      const data = await response.json();
      if (data.success && data.projects.length > 0) {
        setProjects(data.projects);
        setSelectedProject(data.projects[0]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchPredictions = async (project: Project) => {
    if (!project.githubRepo) return;
    
    try {
      setLoading(true);
      const [owner, repo] = project.githubRepo.split('/');
      
      const response = await fetch(
        ${API_BASE_URL}/git/contributors?owner=${owner}&repo=${repo},
        { headers: getHeaders() }
      );
      
      const data = await response.json();
      setContributors(Array.isArray(data) ? data : []);
      
      // Generate ML predictions
      const mlPredictions = (Array.isArray(data) ? data : []).map((c: Contributor) => ({
        contributor: c.username,
        status: c.status,
        confidence: calculateConfidence(c),
        reason: generateReason(c),
        commitCount: c.commitCount,
        linesOfCode: c.linesOfCode,
        inactiveDays: c.daysSinceLastCommit,
        latency: c.daysSinceLastCommit * 24 // Convert to hours
      }));
      
      setPredictions(mlPredictions);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateConfidence = (c: Contributor): number => {
    let score = 0;
    
    // Commit count factor
    if (c.commitCount >= 10) score += 0.4;
    else if (c.commitCount >= 5) score += 0.25;
    else score += 0.1;
    
    // Activity factor
    if (c.daysSinceLastCommit <= 7) score += 0.4;
    else if (c.daysSinceLastCommit <= 30) score += 0.25;
    else score += 0.1;
    
    // LOC factor
    if (c.linesOfCode >= 500) score += 0.2;
    else if (c.linesOfCode >= 100) score += 0.15;
    else score += 0.05;
    
    return Math.min(score, 1);
  };

  const generateReason = (c: Contributor): string => {
    if (c.status === 'Active') {
      return High commit frequency (${c.commitCount} commits) with recent activity. Last commit ${c.daysSinceLastCommit} days ago. Strong contributor.;
    } else if (c.status === 'At Risk') {
      return Moderate activity with ${c.commitCount} commits but ${c.daysSinceLastCommit} days since last commit. May need engagement.;
    } else {
      return Low activity detected. ${c.daysSinceLastCommit} days inactive with only ${c.commitCount} commits. Requires immediate attention.;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchPredictions(selectedProject);
    }
  }, [selectedProject]);

  // Calculate stats
  const activeCount = predictions.filter(p => p.status === 'Active').length;
  const atRiskCount = predictions.filter(p => p.status === 'At Risk').length;
  const inactiveCount = predictions.filter(p => p.status === 'Inactive').length;
  const avgConfidence = predictions.length > 0 
    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
    : 0;

  // Pie chart data
  const pieData = [
    { name: 'Active', value: activeCount, color: '#10b981' },
    { name: 'At Risk', value: atRiskCount, color: '#f59e0b' },
    { name: 'Inactive', value: inactiveCount, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Filter predictions
  const filteredPredictions = filterStatus === 'All' 
    ? predictions 
    : predictions.filter(p => p.status === filterStatus);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-brain fa-pulse text-4xl text-indigo-600"></i>
          </div>
          <p className="text-slate-800 font-black text-xl mb-2">Analyzing Contributors</p>
          <p className="text-slate-400 font-medium animate-pulse">Running ML classification models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">ML Prediction</h1>
        <p className="text-slate-500 font-medium">Why is it happening & who needs attention</p>
        <p className="text-slate-400 text-sm mt-1">Deep analysis, predictions, risk detection</p>
      </header>

      {/* Project Selector */}
      <div className="mb-8 max-w-md">
        <select
          value={selectedProject?._id || ''}
          onChange={(e) => {
            const project = projects.find(p => p._id === e.target.value);
            setSelectedProject(project || null);
          }}
          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.projectName}
            </option>
          ))}
        </select>
      </div>

      {/* Team Health Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-check-circle text-emerald-600 text-xl"></i>
          </div>
          <p className="text-3xl font-black text-slate-800">{activeCount}</p>
          <p className="text-slate-500 text-sm font-semibold mt-1">Active</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-exclamation-triangle text-amber-600 text-xl"></i>
          </div>
          <p className="text-3xl font-black text-slate-800">{atRiskCount}</p>
          <p className="text-slate-500 text-sm font-semibold mt-1">At Risk</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-times-circle text-red-600 text-xl"></i>
          </div>
          <p className="text-3xl font-black text-slate-800">{inactiveCount}</p>
          <p className="text-slate-500 text-sm font-semibold mt-1">Inactive</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-chart-line text-indigo-600 text-xl"></i>
          </div>
          <p className="text-3xl font-black text-slate-800">{(avgConfidence * 100).toFixed(0)}%</p>
          <p className="text-slate-500 text-sm font-semibold mt-1">Avg Confidence</p>
        </div>
      </div>

      {/* Risk Alert Banner */}
      {atRiskCount + inactiveCount > 0 && (
        <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <i className="fas fa-bell text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-900">Risk Alert</h3>
              <p className="text-amber-700 font-medium">
                {atRiskCount + inactiveCount} member{atRiskCount + inactiveCount > 1 ? 's' : ''} {atRiskCount + inactiveCount > 1 ? 'haven\'t' : 'hasn\'t'} committed in 7+ days
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Status Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Status Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Pie chart — Active vs At Risk vs Inactive</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={cell-${index}} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 py-12">No data</p>
          )}
          <div className="mt-4 space-y-2">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="font-semibold text-slate-700">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter by Status */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Filter by Status</h3>
          <div className="flex gap-2 mb-6">
            {['All', 'Active', 'At Risk', 'Inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-sm">
            Showing {filteredPredictions.length} of {predictions.length} contributors
          </p>
        </div>
      </div>

      {/* Per Contributor Analysis */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Per Contributor Analysis</h2>
          <p className="text-xs text-slate-500 mt-1">LOC, latency, inactive days, confidence %, tech role</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-black text-slate-600 uppercase">Contributor</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Commits</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">LOC</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Latency</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Inactive Days</th>
                <th className="text-left px-4 py-3 text-xs font-black text-slate-600 uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((pred, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-700">{pred.contributor}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      pred.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : pred.status === 'At Risk'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {pred.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-800">{pred.commitCount}</td>
                  <td className="px-4 py-4 font-bold text-slate-800">{pred.linesOfCode.toLocaleString()}</td>
                  <td className="px-4 py-4 text-slate-600">{pred.latency.toFixed(0)}h</td>
                  <td className="px-4 py-4">
                    <span className={`font-bold ${
                      pred.inactiveDays > 7 ? 'text-red-600' : pred.inactiveDays > 3 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {pred.inactiveDays}d
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: ${pred.confidence * 100}% }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">{(pred.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Reasoning */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black mb-2">ML Reasoning</h3>
            <p className="text-slate-300 font-medium">Why the model classified them that way</p>
          </div>
        </div>
        <div className="space-y-4">
          {filteredPredictions.slice(0, 3).map((pred, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white">{pred.contributor}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  pred.status === 'Active' 
                    ? 'bg-emerald-500 text-white' 
                    : pred.status === 'At Risk'
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white'
                }`}>
                  {pred.status}
                </span>
              </div>
              <p className="text-slate-300 text-sm italic">"{pred.reason}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Prediction;
