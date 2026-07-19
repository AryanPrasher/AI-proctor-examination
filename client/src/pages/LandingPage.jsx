import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Brain, BarChart3, Trophy, Check, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const { user, token, API_URL } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'content-creator') {
        navigate('/creator');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handlePremiumCheckout = async () => {
    if (!user) {
      navigate('/login?redirect=premium');
      return;
    }
    
    try {
      // Find GMAT Premium product
      const resProducts = await fetch(`${API_URL}/payments/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const productsData = await resProducts.json();
      
      const premiumSeries = (productsData.testSeries || []).find(ts => ts.isPremium);
      if (!premiumSeries) {
        alert('Premium test series package not found.');
        return;
      }

      // Create Stripe checkout session
      const resCheckout = await fetch(`${API_URL}/payments/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ testSeriesId: premiumSeries._id })
      });
      const checkoutData = await resCheckout.json();
      
      if (resCheckout.ok && checkoutData.sessionUrl) {
        window.location.href = checkoutData.sessionUrl;
      } else {
        alert(checkoutData.message || 'Failed to initiate premium purchase checkout.');
      }
    } catch (err) {
      console.error(err);
      alert('Stripe connection error.');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '64px 0', borderBottom: '4px solid #0d0d0d' }}>
        <h1 style={{
          fontSize: '46px',
          fontWeight: '900',
          lineHeight: '1.2',
          marginBottom: '20px',
          textTransform: 'uppercase',
        }}>
          Ace Your Next Exam with <br />
          <span style={{ background: 'var(--primary)', padding: '0 8px', border: '3px solid #0d0d0d', display: 'inline-block', transform: 'rotate(-1deg)' }}>
            AI-Powered
          </span> Adaptive Testing
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          maxWidth: '700px',
          margin: '0 auto 36px auto',
          lineHeight: '1.6',
          fontWeight: '500'
        }}>
          Experience dynamic difficulty scaling calibrated via Item Response Theory (IRT) under robust browser proctoring and comprehensive skill breakdown reports.
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn-primary" style={{ padding: '14px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            Try Free Demo <ArrowRight size={18} />
          </Link>
          <a href="#features" className="btn-secondary" style={{ padding: '14px 28px', textDecoration: 'none' }}>
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '60px 0', borderBottom: '4px solid #0d0d0d' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', textTransform: 'uppercase', marginBottom: '40px' }}>
          Platform Security & Adaptive Logic
        </h2>

        <div className="dashboard-grid">
          <div className="glass-panel" style={{ background: '#ffffff' }}>
            <div style={{ background: 'var(--primary)', border: '2px solid #000', width: '50px', height: '50px', borderRadius: '4px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
              <Brain size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px', textTransform: 'uppercase' }}>Adaptive IRT Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Calibrates user ability ($\theta$) dynamically. Uses Expected A Posteriori (EAP) updates to select high-information questions based on current ability.
            </p>
          </div>

          <div className="glass-panel" style={{ background: '#ffffff' }}>
            <div style={{ background: 'var(--secondary)', border: '2px solid #000', width: '50px', height: '50px', borderRadius: '4px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
              <Shield size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px', textTransform: 'uppercase' }}>Enhanced Proctoring</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Client-side preloaded face detector counts faces and logs visibility changes. Enforces standard fullscreen mode to block background cheat tabs.
            </p>
          </div>

          <div className="glass-panel" style={{ background: '#ffffff' }}>
            <div style={{ background: 'var(--accent)', border: '2px solid #000', width: '50px', height: '50px', borderRadius: '4px', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: '16px' }}>
              <BarChart3 size={24} />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px', textTransform: 'uppercase' }}>Deep Skill Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
              Detailed scorecards provide ability history plots, response times, percentile calculations, and PDF scorecard download tokens.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '60px 0', borderBottom: '4px solid #0d0d0d' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', textTransform: 'uppercase', marginBottom: '40px' }}>
          Simple & Transparent Pricing
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
          {/* Free Plan */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', background: '#ffffff' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '12px' }}>Basic</span>
              <h3 style={{ fontSize: '24px', margin: '8px 0', textTransform: 'uppercase' }}>Free Mock Prep</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Excellent for getting familiar with adaptive IRT constraints.</p>
              
              <div style={{ fontSize: '36px', fontWeight: '900', marginBottom: '24px', color: '#000' }}>
                $0 <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>/ forever</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--secondary)' }} /> Basic Math & Verbal Tests</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--secondary)' }} /> Real-Time Webcam Proctoring</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--secondary)' }} /> Interactive Dashboard access</li>
              </ul>
            </div>

            <Link to="/register" className="btn-secondary" style={{ width: '100%', marginTop: '32px', textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              Sign Up Free
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', border: '4px solid #000', background: '#ffffff' }}>
            <div>
              <span className="badge" style={{ background: 'var(--accent)', marginBottom: '12px' }}>Recommended</span>
              <h3 style={{ fontSize: '24px', margin: '8px 0', textTransform: 'uppercase' }}>Advanced Premium</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Unlock full features and advanced mock exam sets.</p>
              
              <div style={{ fontSize: '36px', fontWeight: '900', marginBottom: '24px', color: '#000' }}>
                $19.99 <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>/ one-time</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--accent)' }} /> High-discrimination IRT question pool</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--accent)' }} /> Deep Analytics & Skill aggregate breakdowns</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--accent)' }} /> Printable PDF Scorecards</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} style={{ color: 'var(--accent)' }} /> Verified Leaderboard ranks comparison</li>
              </ul>
            </div>

            <button onClick={handlePremiumCheckout} className="btn-primary" style={{ width: '100%', marginTop: '32px' }}>
              Buy Premium Prep
            </button>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview Section */}
      <section style={{ padding: '60px 0', borderBottom: '4px solid #0d0d0d' }}>
        <div className="glass-panel" style={{ maxWidth: '700px', margin: '0 auto', background: '#ffffff' }}>
          <h3 style={{ fontSize: '22px', textAlign: 'center', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Trophy style={{ color: 'var(--primary)' }} /> Live Top Performers Rank Preview
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'separate' }}>
            <thead>
              <tr style={{ background: 'var(--primary)' }}>
                <th style={{ padding: '10px 16px', width: '80px' }}>Rank</th>
                <th style={{ padding: '10px 16px' }}>Name</th>
                <th style={{ padding: '10px 16px', width: '120px' }}>IRT Ability ($\theta$)</th>
                <th style={{ padding: '10px 16px', width: '120px' }}>Percentile</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                <td>Elena Rostova</td>
                <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>3.840</td>
                <td>99.98%</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>2</td>
                <td>Alex Mercer</td>
                <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>3.512</td>
                <td>99.92%</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>3</td>
                <td>Deepak Kumar</td>
                <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>3.220</td>
                <td>99.85%</td>
              </tr>
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>
              Sign up now to compete on the leaderboards!
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
        <p>&copy; {new Date().getFullYear()} Apex Exam Suite. Built with Neo-Brutalist Visual Excellence. All rights reserved.</p>
      </footer>

    </div>
  );
};

export default LandingPage;
