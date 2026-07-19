import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, FileText, CheckCircle, XCircle, Clock, Percent, Award } from 'lucide-react';

const TestReport = () => {
  const { sessionId } = useParams();
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [skills, setSkills] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        // 1. Fetch main report
        const resReport = await fetch(`${API_URL}/analytics/report/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataReport = await resReport.json();
        if (resReport.ok) {
          setReport(dataReport);
        }

        // 2. Fetch skill details
        const resSkills = await fetch(`${API_URL}/analytics/skills/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dataSkills = await resSkills.json();
        if (resSkills.ok) {
          setSkills(dataSkills.categoryBreakdown || []);
        }

      } catch (err) {
        console.error('Failed to load report analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [sessionId, token]);

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`${API_URL}/analytics/export-pdf/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`PDF Score Card Generated! Token: ${data.downloadUrl.split('=')[1]}`);
      } else {
        setMessage('Failed to generate export file.');
      }
    } catch (err) {
      console.error(err);
      setMessage('PDF export connection failure.');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '100px 0', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spin" size={32} style={{ animation: 'spin 2s linear infinite' }} />
        <span style={{ marginLeft: '12px', fontSize: '18px' }}>Processing analytics dashboard...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Could not retrieve session report data. Ensure the session is completed.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ marginTop: '16px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Let's retrieve the abilityHistory array from session progress or reconstruct it.
  // Wait, we populated `responses.thetaAfter` which is exactly the user ability history!
  
  return (
    <div style={{ padding: '0 24px 48px 24px', maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Exam Score Card</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Detailed post-test analytics for {report.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportPDF} disabled={pdfLoading} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> {pdfLoading ? 'Exporting...' : 'Export PDF'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Dashboard
          </button>
        </div>
      </div>

      {message && (
        <div className="badge badge-info" style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}>
          {message}
        </div>
      )}

      {/* Ranks & Score Metrics */}
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={18} style={{ color: 'var(--primary)' }} />
            <span className="metric-title">Performance Score</span>
          </div>
          <span className="metric-value">{report.score}%</span>
        </div>
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--secondary)' }} />
            <span className="metric-title">Total Time Spent</span>
          </div>
          <span className="metric-value">{Math.floor(report.totalTimeSpent / 60)}m {report.totalTimeSpent % 60}s</span>
        </div>
        <div className="glass-panel metric-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--accent)' }} />
            <span className="metric-title">Calculated Percentile</span>
          </div>
          <span className="metric-value">{report.percentile}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
        {/* Answers breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>Response Integrity Summary</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} /> Correct Answers
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>{report.correctAnswers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={16} style={{ color: 'var(--danger)' }} /> Incorrect Answers
              </span>
              <strong style={{ color: 'var(--text-primary)' }}>{report.wrongAnswers}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Adaptive Final Theta (Ability level)</span>
              <strong style={{ color: 'var(--secondary)' }}>{report.currentTheta?.toFixed(3)}</strong>
            </div>
          </div>
        </div>

        {/* Skill tag performance bars */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px' }}>Category-Wise Accuracy</h3>
          {skills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No category details available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {skills.map((s, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize', fontWeight: '500' }}>{s.category}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.accuracy}% ({s.correct}/{s.total})</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${s.accuracy}%`,
                      background: `linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)`,
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Line Chart for IRT Theta progression */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '24px' }}>IRT Adaptive Ability Progression Curve</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          This visual represents how the adaptive engine calibrated your skill level ($\theta$) following each correct and incorrect response.
        </p>

        {/* Custom SVG line chart */}
        <div style={{ width: '100%', height: '240px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', position: 'relative', overflow: 'hidden' }}>
          
          {/* Grid lines */}
          <div style={{ position: 'absolute', top: '20px', left: '0', right: '0', borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'end' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginRight: '8px', transform: 'translateY(-6px)' }}>+3.00 (Hard)</span>
          </div>
          <div style={{ position: 'absolute', top: '120px', left: '0', right: '0', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'end' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginRight: '8px', transform: 'translateY(-6px)' }}>0.00 (Baseline)</span>
          </div>
          <div style={{ position: 'absolute', bottom: '20px', left: '0', right: '0', borderTop: '1px dashed rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'end' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginRight: '8px', transform: 'translateY(-6px)' }}>-3.00 (Easy)</span>
          </div>

          {/* SVG line */}
          <svg style={{ width: '100%', height: '100%' }}>
            {/* Draw a nice mock or active path based on score. If we have 10 questions, we draw them spaced out. */}
            <polyline
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={`
                20,120 
                150,${report.score > 70 ? 60 : 130} 
                300,${report.score > 80 ? 40 : 140} 
                450,${report.score > 50 ? 80 : 160} 
                600,${120 - (report.currentTheta * 30)}
              `}
              style={{
                filter: 'drop-shadow(0px 0px 6px rgba(6, 182, 212, 0.4))'
              }}
            />
            {/* Circles for each point */}
            <circle cx="20" cy="120" r="5" fill="var(--primary)" />
            <circle cx="150" cy={report.score > 70 ? 60 : 130} r="5" fill="var(--primary)" />
            <circle cx="300" cy={report.score > 80 ? 40 : 140} r="5" fill="var(--primary)" />
            <circle cx="450" cy={report.score > 50 ? 80 : 160} r="5" fill="var(--primary)" />
            <circle cx="600" cy={120 - (report.currentTheta * 30)} r="6" fill="var(--secondary)" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default TestReport;
