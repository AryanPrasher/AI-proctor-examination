import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Trophy, Users } from 'lucide-react';

const Leaderboard = () => {
  const { token, API_URL, user } = useAuth();
  
  const [testSeries, setTestSeries] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState('global');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRankData, setUserRankData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load test series list for dropdown
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await fetch(`${API_URL}/payments/products`);
        const data = await res.json();
        setTestSeries(data.products || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSeries();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      if (selectedSeriesId === 'global') {
        const res = await fetch(`${API_URL}/leaderboards/global`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
        setUserRankData(null);
      } else {
        // Fetch test series specific leaderboard
        const res = await fetch(`${API_URL}/leaderboards/test-series/${selectedSeriesId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);

        // Fetch current user rank and peers neighbors
        const resRank = await fetch(`${API_URL}/leaderboards/user-rank/${selectedSeriesId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataRank = await resRank.json();
        if (resRank.ok) {
          setUserRankData(dataRank);
        } else {
          setUserRankData(null);
        }
      }

      // Fetch monthly trends
      const resTrends = await fetch(`${API_URL}/leaderboards/trends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTrends = await resTrends.json();
      setTrends(dataTrends.trends || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboardData();
  }, [selectedSeriesId]);

  return (
    <div style={{ padding: '0 24px 48px 24px', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Peer Leaderboards</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Compare your performance parameters against peers globally</p>
        </div>
        
        {/* Toggle Dropdown */}
        <div>
          <select
            className="form-input"
            value={selectedSeriesId}
            onChange={(e) => setSelectedSeriesId(e.target.value)}
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--primary)', color: 'var(--text-primary)', fontWeight: '600' }}
          >
            <option value="global">Global Standings (by θ)</option>
            {testSeries.map((s) => (
              <option key={s._id} value={s._id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '100px 0', color: 'var(--text-secondary)' }}>
          <RefreshCw className="spin" size={32} style={{ animation: 'spin 2s linear infinite' }} />
          <span style={{ marginLeft: '12px', fontSize: '18px' }}>Loading board rankings...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Neighbors Context Card (User Rank) */}
          {userRankData && userRankData.userRank && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--secondary)' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--secondary)' }} /> Your Placement Neighbors
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                You are currently ranked <strong>#{userRankData.userRank}</strong>. Here is how you place relative to adjacent peers:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userRankData.peers.map((peer) => (
                  <div 
                    key={peer.userId} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 16px',
                      background: peer.isCurrentUser ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${peer.isCurrentUser ? 'var(--primary)' : 'transparent'}`,
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: peer.isCurrentUser ? '#fff' : 'var(--text-secondary)',
                      fontWeight: peer.isCurrentUser ? 'bold' : 'normal'
                    }}
                  >
                    <span>#{peer.rank} - {peer.name} {peer.isCurrentUser && '(You)'}</span>
                    <span>Score: {peer.bestScore}% | θ: {peer.theta.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Leaderboard Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} style={{ color: 'var(--warning)' }} /> 
              {selectedSeriesId === 'global' ? 'Global Ability Leaderboard (Top 100)' : 'Series Best Score Standings'}
            </h3>

            {leaderboard.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No candidates listed on this board yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <th style={{ padding: '12px' }}>Rank</th>
                      <th style={{ padding: '12px' }}>Candidate Name</th>
                      {selectedSeriesId === 'global' ? (
                        <>
                          <th style={{ padding: '12px' }}>Max Ability (θ)</th>
                          <th style={{ padding: '12px' }}>Max Mock Score</th>
                          <th style={{ padding: '12px' }}>Sessions Run</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '12px' }}>Best Score</th>
                          <th style={{ padding: '12px' }}>Final Theta (θ)</th>
                          <th style={{ padding: '12px' }}>Date Submitted</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr 
                        key={entry.userId} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.03)', 
                          fontSize: '14px',
                          background: entry.userId === user?._id ? 'rgba(99,102,241,0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 'bold', color: idx === 0 ? 'var(--warning)' : idx === 1 ? 'var(--text-secondary)' : idx === 2 ? '#b45309' : 'var(--text-muted)' }}>
                          #{entry.rank || idx + 1}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                          {entry.name} {entry.userId === user?._id && '(You)'}
                        </td>
                        {selectedSeriesId === 'global' ? (
                          <>
                            <td style={{ padding: '12px', color: 'var(--secondary)' }}>{entry.maxTheta.toFixed(3)}</td>
                            <td style={{ padding: '12px' }}>{entry.maxScore}%</td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{entry.sessionsCount}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px', color: 'var(--success)' }}>{entry.bestScore}%</td>
                            <td style={{ padding: '12px', color: 'var(--secondary)' }}>{entry.theta.toFixed(3)}</td>
                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                              {new Date(entry.completedAt).toLocaleDateString()}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Trends Sidebar/Row */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>Top Monthly Performers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {trends.slice(0, 3).map((trend, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>#{trend.rank} Monthly Star</span>
                    <span>{new Date(trend.date).toLocaleDateString()}</span>
                  </div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '14px', display: 'block', marginBottom: '4px' }}>{trend.name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {trend.testTitle} — <strong>{trend.score}%</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Leaderboard;
