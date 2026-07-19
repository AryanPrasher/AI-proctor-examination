import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('test-taker');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await register(name, email, password, role);
    setSubmitting(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '24px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <h2 style={{ fontSize: '28px', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '8px' }}>Create Account</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
          Start proctored adaptive testing
        </p>

        {error && (
          <div className="badge badge-danger" style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'center', marginBottom: '16px', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (Min 6 chars)"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Register As</label>
            <select 
              className="form-input"
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ background: 'var(--bg-surface)' }}
            >
              <option value="test-taker">Test-Taker (Candidate)</option>
              <option value="content-creator">Content Creator (Author)</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '12px', marginTop: '8px' }}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: '600' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
