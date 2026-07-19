import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash, BookOpen, Upload, RefreshCw, Layers } from 'lucide-react';

const ContentCreator = () => {
  const { token, API_URL } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'testseries' | 'pool'
  
  // Question Form State
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [difficulty, setDifficulty] = useState(0.0);
  const [discrimination, setDiscrimination] = useState(1.0);
  const [guessing, setGuessing] = useState(0.25);
  const [category, setCategory] = useState('general');

  // Test Series Form State
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesDesc, setSeriesDesc] = useState('');
  const [seriesPrice, setSeriesPrice] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [maxViolations, setMaxViolations] = useState(3);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Bulk Import State
  const [bulkJson, setBulkJson] = useState('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/questions/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleOptionChange = (idx, value) => {
    const nextOpts = [...options];
    nextOpts[idx] = value;
    setOptions(nextOpts);
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/questions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          options: options.filter(o => o.trim() !== ''),
          correctOptionIndex: Number(correctIndex),
          difficulty: Number(difficulty),
          discrimination: Number(discrimination),
          guessing: Number(guessing),
          category: category.toLowerCase().trim()
        })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Question created successfully!');
        setText('');
        setOptions(['', '', '', '']);
        loadQuestions();
      } else {
        setMessage(data.message || 'Creation failed');
      }
    } catch (err) {
      console.error(err);
      setMessage('Question submit connection error');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const parsed = JSON.parse(bulkJson);
      const res = await fetch(`${API_URL}/questions/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions: parsed })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Bulk import successful!');
        setBulkJson('');
        loadQuestions();
      } else {
        setMessage(data.message || 'Bulk import failed');
      }
    } catch {
      setMessage('Invalid JSON format. Check syntax.');
    }
  };

  const handleCreateTestSeries = async (e) => {
    e.preventDefault();
    setMessage('');

    if (selectedQuestions.length === 0) {
      setMessage('Please select at least one question to bundle into this series.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/test-series/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: seriesTitle,
          description: seriesDesc,
          price: Number(seriesPrice),
          isPremium,
          maxViolationsAllowed: Number(maxViolations),
          questions: selectedQuestions
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Test Series "${data.testSeries.title}" created successfully!`);
        setSeriesTitle('');
        setSeriesDesc('');
        setSeriesPrice(0);
        setIsPremium(false);
        setMaxViolations(3);
        setSelectedQuestions([]);
      } else {
        setMessage(data.message || 'Failed to create Test Series');
      }
    } catch (err) {
      console.error(err);
      setMessage('Test Series connection error');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Archive this question?')) return;
    try {
      const res = await fetch(`${API_URL}/questions/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage('Question archived.');
        loadQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSelectQuestion = (id) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qid => qid !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  return (
    <div style={{ padding: '0 24px 48px 24px', maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '32px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: '800' }}>Content Creator Panel</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage question inventory and publish adaptive test series</p>
        </div>
        <button onClick={loadQuestions} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} /> Sync Pool
        </button>
      </div>

      {message && (
        <div className="badge badge-info animate-fade-in" style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', marginBottom: '24px', borderRadius: 'var(--radius-sm)' }}>
          {message}
        </div>
      )}

      {/* Tabs selectors */}
      <div className="tab-container">
        <button 
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Create Questions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'testseries' ? 'active' : ''}`}
          onClick={() => setActiveTab('testseries')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <BookOpen size={16} /> Bundle Test Series
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pool' ? 'active' : ''}`}
          onClick={() => setActiveTab('pool')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={16} /> Question Pool ({questions.length})
        </button>
      </div>

      {/* TAB 1: CREATE QUESTIONS */}
      {activeTab === 'questions' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
          {/* Creator Form */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} /> Add Individual Item
            </h3>

            <form onSubmit={handleCreateQuestion}>
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Solve for x: 3x + 5 = 20"
                  style={{ resize: 'vertical', minHeight: '80px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Option A</label>
                  <input type="text" className="form-input" value={options[0]} onChange={(e) => handleOptionChange(0, e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Option B</label>
                  <input type="text" className="form-input" value={options[1]} onChange={(e) => handleOptionChange(1, e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Option C</label>
                  <input type="text" className="form-input" value={options[2]} onChange={(e) => handleOptionChange(2, e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Option D</label>
                  <input type="text" className="form-input" value={options[3]} onChange={(e) => handleOptionChange(3, e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Correct Option Index</label>
                  <select className="form-input" value={correctIndex} onChange={(e) => setCorrectIndex(e.target.value)} style={{ background: 'var(--bg-surface)' }}>
                    <option value={0}>Option A (Index 0)</option>
                    <option value={1}>Option B (Index 1)</option>
                    <option value={2}>Option C (Index 2)</option>
                    <option value={3}>Option D (Index 3)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Category Subject Tag</label>
                  <input type="text" className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. math" required />
                </div>
              </div>

              {/* IRT Metrics */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '20px' }}>
                <span className="form-label" style={{ display: 'block', marginBottom: '12px', fontSize: '12px' }}>Item Response Theory Calibration (2PL/3PL)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Difficulty (b)</label>
                    <input type="number" step="0.1" className="form-input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Discrimination (a)</label>
                    <input type="number" step="0.1" className="form-input" value={discrimination} onChange={(e) => setDiscrimination(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '10px' }}>Guessing (c)</label>
                    <input type="number" step="0.05" className="form-input" value={guessing} onChange={(e) => setGuessing(e.target.value)} required />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                Publish Question
              </button>
            </form>
          </div>

          {/* Bulk Import */}
          <div className="glass-panel" style={{ padding: '28px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} style={{ color: 'var(--accent)' }} /> Bulk JSON Uploader
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.4' }}>
              Upload multiple questions instantly. Paste a structured JSON array of questions matching fields.
            </p>

            <form onSubmit={handleBulkImport}>
              <div className="form-group">
                <textarea
                  className="form-input"
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder='Copy-paste JSON list, e.g.&#10;[&#10;  {&#10;    "text": "Solve for x: x + 2 = 5",&#10;    "options": ["1", "3", "5"],&#10;    "correctOptionIndex": 1,&#10;    "category": "math",&#10;    "difficulty": 0.0&#10;  }&#10;]'
                  style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '12px' }}
                  required
                />
              </div>
              <button type="submit" className="btn-secondary" style={{ width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(168, 85, 247, 0.03)' }}>
                Execute Bulk Import
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: BUNDLE TEST SERIES */}
      {activeTab === 'testseries' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Metadata Card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: 'var(--secondary)' }} /> Configure Test Package details
            </h3>

            <form onSubmit={handleCreateTestSeries}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Series Package Title</label>
                  <input type="text" className="form-input" value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} placeholder="e.g. GRE Math Advanced Mock" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Description</label>
                  <input type="text" className="form-input" value={seriesDesc} onChange={(e) => setSeriesDesc(e.target.value)} placeholder="Description of topics covered" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Pricing Rules ($)</label>
                  <input type="number" className="form-input" value={seriesPrice} onChange={(e) => setSeriesPrice(e.target.value)} min={0} disabled={!isPremium} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Violations Allowed</label>
                  <input type="number" className="form-input" value={maxViolations} onChange={(e) => setMaxViolations(e.target.value)} min={1} required />
                </div>
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                    Premium Locked Series
                  </label>
                </div>
              </div>

              {/* Questions selection grid */}
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                Select Questions to Include ({selectedQuestions.length} selected)
              </h4>
              
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '24px', background: 'rgba(0,0,0,0.1)' }}>
                {questions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', padding: '16px', textAlign: 'center', fontSize: '13px' }}>Create questions first in the previous tab to bundle them.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '8px 12px', width: '40px' }}>Select</th>
                        <th style={{ padding: '8px 12px', width: '120px' }}>Subject</th>
                        <th style={{ padding: '8px 12px' }}>Question Prompt</th>
                        <th style={{ padding: '8px 12px', width: '100px' }}>Difficulty (b)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q) => (
                        <tr 
                          key={q._id} 
                          onClick={() => handleToggleSelectQuestion(q._id)}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer', background: selectedQuestions.includes(q._id) ? 'rgba(99,102,241,0.05)' : 'transparent' }}
                        >
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedQuestions.includes(q._id)} 
                              onChange={() => {}} // Handled by tr onClick
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className="badge badge-info" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{q.category}</span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }}>{q.text}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--secondary)', fontWeight: 'bold' }}>{q.difficulty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                Publish Test Series Package
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: POOL INVENTORY */}
      {activeTab === 'pool' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', overflowX: 'auto' }}>
          {questions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '36px 0' }}>No active questions in item pool.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>Subject</th>
                  <th style={{ padding: '12px' }}>Question Text</th>
                  <th style={{ padding: '12px' }}>Difficulty (b)</th>
                  <th style={{ padding: '12px' }}>Discrimination (a)</th>
                  <th style={{ padding: '12px' }}>Guessing (c)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '14px' }}>
                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{q.category}</span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--secondary)', fontWeight: 'bold' }}>{q.difficulty}</td>
                    <td style={{ padding: '12px' }}>{q.discrimination}</td>
                    <td style={{ padding: '12px' }}>{q.guessing}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteQuestion(q._id)}
                        className="btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
};

export default ContentCreator;
