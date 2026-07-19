import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Award, Shield, FileText, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout, notifications, markNotificationAsRead } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  if (!user) {
    return (
      <nav className="glass-panel" style={{
        position: 'sticky',
        top: '16px',
        margin: '16px 24px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        borderRadius: 'var(--radius-md)',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '22px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ApexProctor
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px' }}>Home</Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/login" className="btn-secondary" style={{ padding: '8px 16px', textDecoration: 'none', fontSize: '13px' }}>Sign In</Link>
          <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', textDecoration: 'none', fontSize: '13px' }}>Sign Up</Link>
        </div>
      </nav>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-panel" style={{
      position: 'sticky',
      top: '16px',
      margin: '16px 24px',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/dashboard" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: '800',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ApexProctor
          </span>
        </Link>

        {/* Dynamic Navigation Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px' }}>Dashboard</Link>
          <Link to="/leaderboard" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Award size={16} /> Leaderboard
          </Link>
          
          {user.role === 'content-creator' && (
            <Link to="/creator" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={16} /> Content Creator
            </Link>
          )}
          
          {user.role === 'admin' && (
            <>
              <Link to="/admin" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={16} /> Admin Panel
              </Link>
              <Link to="/admin/review" style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '14px' }}>Cheat Reviews</Link>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <User size={16} />
          <span>{user.name}</span>
          <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px' }}>{user.role}</span>
        </div>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '8px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--danger)',
                color: 'var(--text-primary)',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Glass Dropdown */}
          {showNotifications && (
            <div className="glass-panel animate-fade-in" style={{
              position: 'absolute',
              top: '46px',
              right: '0',
              width: '320px',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              zIndex: 110,
            }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Notifications</h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>No notifications</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map((n) => (
                    <div 
                      key={n._id} 
                      onClick={() => !n.isRead && markNotificationAsRead(n._id)}
                      style={{
                        padding: '8px 12px',
                        background: n.isRead ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.08)',
                        borderLeft: `3px solid ${n.type === 'alert' ? 'var(--danger)' : n.type === 'purchase' ? 'var(--success)' : 'var(--primary)'}`,
                        borderRadius: '4px',
                        cursor: n.isRead ? 'default' : 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{n.title}</strong>
                        {!n.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginLeft: 'auto' }}></span>}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.message}</p>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
