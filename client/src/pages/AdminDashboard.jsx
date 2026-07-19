import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, RefreshCw, ShieldAlert, FileSpreadsheet } from 'lucide-react';

const AdminDashboard = () => {
  const { token, API_URL } = useAuth();
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    pendingFlags: 0,
    totalRevenue: 0,
    totalQuestions: 0
  });
  
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Stats
      const resStats = await fetch(`${API_URL}/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataStats = await resStats.json();
      if (resStats.ok) setStats(dataStats);

      // 2. Fetch Users
      const resUsers = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      if (resUsers.ok) setUsers(dataUsers.users || []);

      // 3. Fetch Audit Logs
      const resLogs = await fetch(`${API_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataLogs = await resLogs.json();
      if (resLogs.ok) setLogs(dataLogs.logs || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('User role updated successfully');
        loadAdminData();
      } else {
        setMessage(data.message || 'Failed to update user role');
      }
    } catch (err) {
      console.error(err);
      setMessage('Role change connection error');
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/export-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Data export package generated: ${data.fileName}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '100px 0', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spin" size={32} style={{ animation: 'spin 2s linear infinite' }} />
        <span style={{ marginLeft: '12px', fontSize: '18px' }}>Loading administrator panel...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px 48px 24px', maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>System Administrator Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live platform monitoring, user authorization control, and security audit metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={16} /> Export System Data
          </button>
          <button onClick={loadAdminData} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> Sync
          </button>
        </div>
      </div>

      {message && (
        <div className="badge badge-info" style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}>
          {message}
        </div>
      )}

      {/* Metrics Row */}
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-panel metric-card">
          <span className="metric-title">Total Registered Candidates</span>
          <span className="metric-value" style={{ color: 'var(--secondary)' }}>{stats.totalUsers}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-title">Live Active Test Sessions</span>
          <span className="metric-value" style={{ color: 'var(--accent)' }}>{stats.activeSessions}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-title">Pending Cheat Flag Reviews</span>
          <span className="metric-value" style={{ color: 'var(--danger)' }}>{stats.pendingFlags}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-title">Calculated Sales Revenue</span>
          <span className="metric-value" style={{ color: 'var(--success)' }}>${stats.totalRevenue}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        {/* Users Table */}
        <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--primary)' }} /> Registered Platform Accounts
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Email Address</th>
                <th style={{ padding: '12px' }}>Authorization Role</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '14px' }}>
                  <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>{u.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-info">{u.role}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <select
                      className="form-input"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--bg-surface)' }}
                    >
                      <option value="test-taker">Test-Taker</option>
                      <option value="content-creator">Content Creator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Logs list */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--warning)' }} /> Security Audit Trails
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No logs recorded.</p>
            ) : (
              logs.map((log) => (
                <div key={log._id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <strong>{log.action}</strong>
                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Performed by: <strong>{log.performedBy?.name}</strong> ({log.performedBy?.role})
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Details: {JSON.stringify(log.details)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
