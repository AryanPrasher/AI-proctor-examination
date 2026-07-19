import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';

const AdminReview = () => {
  const { token, API_URL } = useAuth();
  
  const [flaggedSessions, setFlaggedSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchFlagged = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/reviews/flagged-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFlaggedSessions(data.flagged || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagged();
  }, []);

  const handleSelectSession = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setTimelineLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/reviews/session-timeline/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSession(data.session);
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleUpdateStatus = async (statusVal) => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`${API_URL}/reviews/status/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reviewStatus: statusVal })
      });
      if (res.ok) {
        setMessage(`Session review status updated to "${statusVal}"`);
        fetchFlagged();
        handleSelectSession(selectedSessionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedSessionId || !commentText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/reviews/comment/${selectedSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commentText })
      });
      if (res.ok) {
        setMessage('Admin note appended to session flags.');
        setCommentText('');
        handleSelectSession(selectedSessionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisqualify = async (e) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    try {
      const res = await fetch(`${API_URL}/reviews/disqualify/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: disqualifyReason })
      });
      if (res.ok) {
        setMessage('Candidate disqualified. Score has been voided.');
        setDisqualifyReason('');
        fetchFlagged();
        handleSelectSession(selectedSessionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '0 24px 48px 24px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Anti-Cheat Flag Review Workflow</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review candidate behavioral violation logs, timelines, and authorize score decisions</p>
        </div>
        <button onClick={fetchFlagged} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={16} /> Sync flagged list
        </button>
      </div>

      {message && (
        <div className="badge badge-info" style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px' }}>
        {/* Left Column: Flagged Sessions List */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--danger)' }} /> Pending review list
          </h3>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <RefreshCw className="spin" size={24} style={{ animation: 'spin 2s linear infinite' }} />
            </div>
          ) : flaggedSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No cheating warnings flagged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {flaggedSessions.map((s) => (
                <div
                  key={s._id}
                  onClick={() => handleSelectSession(s._id)}
                  style={{
                    padding: '16px',
                    background: selectedSessionId === s._id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedSessionId === s._id ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{s.user?.name}</strong>
                    <span className={`badge ${s.reviewStatus === 'pending' ? 'badge-warning' : s.reviewStatus === 'confirmed-cheat' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '9px' }}>
                      {s.reviewStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Series: {s.testSeries?.title}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Violations: {s.proctoringFlags?.length} logged</span>
                    <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Session Details and Timeline logs */}
        <div>
          {timelineLoading ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <RefreshCw className="spin" size={32} style={{ animation: 'spin 2s linear infinite' }} />
              <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Compiling log timeline...</span>
            </div>
          ) : selectedSession ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Actions panel */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>Authorizations & Reviews Decisions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
                  <button onClick={() => handleUpdateStatus('dismissed')} className="btn-secondary" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                    Dismiss Flags (Clear Candidate)
                  </button>
                  <button onClick={() => handleUpdateStatus('pending')} className="btn-secondary" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                    Mark Pending Review
                  </button>
                  <button onClick={() => handleUpdateStatus('confirmed-cheat')} className="btn-primary" style={{ background: 'var(--danger)', boxShadow: 'none' }}>
                    Confirm Cheat Status
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  {/* Notes form */}
                  <form onSubmit={handleAddComment}>
                    <div className="form-group">
                      <label className="form-label">Add Admin Comment / Note</label>
                      <input
                        type="text"
                        className="form-input"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Log review findings..."
                        required
                      />
                    </div>
                    <button type="submit" className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> Save Note
                    </button>
                  </form>

                  {/* Disqualify form */}
                  <form onSubmit={handleDisqualify}>
                    <div className="form-group">
                      <label className="form-label">Void Test & Disqualify</label>
                      <input
                        type="text"
                        className="form-input"
                        value={disqualifyReason}
                        onChange={(e) => setDisqualifyReason(e.target.value)}
                        placeholder="Reason for score invalidation..."
                        required
                      />
                    </div>
                    <button type="submit" className="btn-danger" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <AlertCircle size={14} /> Disqualify Score
                    </button>
                  </form>
                </div>
              </div>

              {/* Event timeline */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Temporal Event Timeline</h3>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="all" style={{ background: '#222' }}>All Events</option>
                    <option value="device-detected" style={{ background: '#222' }}>Device Detected Only</option>
                    <option value="tab-switch" style={{ background: '#222' }}>Tab Switches Only</option>
                    <option value="face-visible" style={{ background: '#222' }}>Camera Face Flags Only</option>
                  </select>
                </div>
                
                <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {timeline.filter(event => {
                    if (filterType === 'all') return true;
                    if (filterType === 'device-detected') {
                      return event.type === 'violation-flag' && event.description.includes('device-detected');
                    }
                    if (filterType === 'tab-switch') {
                      return event.type === 'violation-flag' && event.description.includes('tab-switch');
                    }
                    if (filterType === 'face-visible') {
                      return event.type === 'violation-flag' && (event.description.includes('face-not-visible') || event.description.includes('multiple-faces'));
                    }
                    return true;
                  }).map((event, idx) => {
                    const isViolation = event.type === 'violation-flag';
                    
                    return (
                      <div key={idx} style={{ position: 'relative' }}>
                        {/* Event node dot */}
                        <div style={{
                          position: 'absolute',
                          left: '-31px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: isViolation ? 'var(--danger)' : 'var(--success)',
                          border: '2px solid var(--bg-main)',
                          boxShadow: isViolation ? '0 0 8px var(--danger)' : 'none'
                        }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <strong>{event.description}</strong>
                          <span>{new Date(event.time).toLocaleTimeString()}</span>
                        </div>

                        {event.details && (
                          <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            {event.details.question && <p><strong>Question:</strong> {event.details.question}</p>}
                            {event.details.timeSpent !== undefined && <p><strong>Time spent:</strong> {event.details.timeSpent}s | <strong>Ability after (θ):</strong> {event.details.thetaAfter?.toFixed(3)}</p>}
                            
                            {/* Device Detection details badge */}
                            {event.description.includes('device-detected') && event.details.metadata && (
                              <p style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="badge badge-danger" style={{ fontSize: '9px', padding: '2px 6px' }}>DEVICE SPOTTED</span>
                                <strong>Object:</strong> {event.details.metadata.object} | 
                                <strong> Confidence:</strong> {(event.details.metadata.confidence * 100).toFixed(1)}%
                              </p>
                            )}

                            {event.details.severity && <p style={{ marginTop: '4px' }}><strong>Severity:</strong> <span className={`badge ${event.details.severity === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '8px', padding: '1px 4px' }}>{event.details.severity}</span></p>}
                            {event.details.adminComment && <p style={{ marginTop: '4px' }}><strong>Comment:</strong> <em>{event.details.adminComment}</em></p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Select a flagged mock session from the list to load timelines, flags history, and review actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReview;
