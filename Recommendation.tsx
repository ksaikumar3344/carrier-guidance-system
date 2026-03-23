
import React, { useEffect, useState } from 'react';
import { GitService } from '../services/gitService';
import { Recommendation } from '../types';

const RecommendationPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const data = await GitService.getRecommendations();
      setRecommendations(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve strategic recommendations from the decision engine.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getIcon = (category: string) => {
    switch (category) {
      case 'Platform': return 'fa-rocket text-purple-600 bg-purple-50 border-purple-100';
      case 'Feedback': return 'fa-comments text-blue-600 bg-blue-50 border-blue-100';
      case 'Workflow': return 'fa-sync text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'fa-lightbulb text-indigo-600 bg-indigo-50 border-indigo-100';
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-lightbulb fa-beat text-4xl text-indigo-600"></i>
          <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Generating Actionable Insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-screen flex items-center justify-center">
        <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-red-50 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-triangle-exclamation text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Strategy Service Offline</h2>
          <p className="text-slate-500 mt-3 mb-10 leading-relaxed font-medium">{error}</p>
          <button 
            onClick={() => fetchRecommendations()} 
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            <i className="fas fa-rotate"></i>
            Restore Strategies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Advisory Engine</h1>
          <p className="text-slate-500 font-medium">Data-driven strategies to boost team velocity.</p>
        </div>
        <button 
          onClick={() => fetchRecommendations(true)}
          disabled={refreshing}
          className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt ${refreshing ? 'fa-spin text-indigo-600' : ''}`}></i>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {recommendations.map((rec) => (
          <div key={rec.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition-all group">
            <div className="flex flex-col sm:flex-row gap-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shrink-0 border-2 transition-transform group-hover:scale-110 shadow-sm ${getIcon(rec.category)}`}>
                <i className={`fas ${getIcon(rec.category).split(' ')[0]} text-3xl`}></i>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{rec.title}</h3>
                  <span className="text-[10px] uppercase font-black px-3 py-1 rounded-full bg-slate-100 text-slate-500 tracking-widest">
                    {rec.category}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-6 font-medium">{rec.description}</p>
                <button className="px-6 py-2.5 bg-slate-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 flex items-center gap-3">
                  Implement Insight <i className="fas fa-arrow-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 p-12 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden shadow-[0_40px_60px_-15px_rgba(0,0,0,0.3)]">
        <div className="relative z-10 text-center">
          <div className="w-16 h-1 bg-indigo-500 mx-auto mb-8 rounded-full"></div>
          <h2 className="text-4xl font-black mb-6 tracking-tighter">Scale Your Ecosystem</h2>
          <p className="text-slate-400 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
            Our modular architecture supports unified ingestion from <span className="text-white font-bold">Jira, Slack, and CI/CD pipelines</span> for a holistic productivity perspective.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <div className="px-6 py-3 bg-slate-800/50 rounded-2xl flex items-center gap-3 text-sm font-bold border border-white/5 hover:border-white/20 transition-all cursor-default group">
              <i className="fa-brands fa-jira text-blue-400 group-hover:scale-125 transition-transform"></i> Jira Systems
            </div>
            <div className="px-6 py-3 bg-slate-800/50 rounded-2xl flex items-center gap-3 text-sm font-bold border border-white/5 hover:border-white/20 transition-all cursor-default group">
              <i className="fa-brands fa-slack text-purple-400 group-hover:scale-125 transition-transform"></i> Slack Comms
            </div>
            <div className="px-6 py-3 bg-slate-800/50 rounded-2xl flex items-center gap-3 text-sm font-bold border border-white/5 hover:border-white/20 transition-all cursor-default group">
              <i className="fa-brands fa-trello text-blue-500 group-hover:scale-125 transition-transform"></i> Trello Boards
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full"></div>
      </div>
    </div>
  );
};

export default RecommendationPage;
