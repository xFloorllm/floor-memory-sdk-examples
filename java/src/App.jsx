import { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { authService } from './services/authService';
import QueryConversation from './components/QueryConversation';
import CreateEvent from './components/CreateEvent';
import RecentEvents from './components/RecentEvents';
import TakeNotes from './components/TakeNotes';
import ConversationHistory from './components/ConversationHistory';
import CredentialsInput from './components/CredentialsInput';
import './App.css';

function App() {
  const { isAuthenticated, user, podInfo, loading, signOut, updatePodInfo } = useAuth();
  const [activeView, setActiveView] = useState('home'); // 'home', 'query', 'create', 'recent', 'notes'
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [showEditFloorModal, setShowEditFloorModal] = useState(false);
  const [editFloorData, setEditFloorData] = useState({ title: '', details: '', logo_file: null });
  const [editFloorLoading, setEditFloorLoading] = useState(false);
  const [editFloorError, setEditFloorError] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileMenuRef = useRef(null);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Apply theme to body element
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleEditFloor = async (e) => {
    e.preventDefault();
    setEditFloorLoading(true);
    setEditFloorError(null);

    try {
      const updatedFloor = await authService.editFloor({
        floor_id: podInfo.floor_id,
        title: editFloorData.title || undefined,
        details: editFloorData.details || undefined,
        logo_file: editFloorData.logo_file || undefined,
      });

      updatePodInfo(updatedFloor);
      setShowEditFloorModal(false);
      setEditFloorData({ title: '', details: '', logo_file: null });
    } catch (err) {
      setEditFloorError(err.message || 'Failed to edit floor');
    } finally {
      setEditFloorLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFloorData(prev => ({ ...prev, logo_file: file }));
    }
  };

  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loader">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <CredentialsInput />
      </div>
    );
  }

  return (
    <div className={`app main-app ${theme}-theme`}>
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>xFloor Memory SDK Demo Java</h1>
            <p>Conversational AI with Memory Management</p>
          </div>
          <div className="user-info">
            <button onClick={toggleTheme} className="theme-toggle-btn" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                className="profile-avatar-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                title="Profile menu"
              >
                {user?.profile?.avatar?.url ? (
                  <img src={user.profile.avatar.url} alt="Profile" className="profile-avatar" />
                ) : (
                  <span className="profile-avatar-placeholder">
                    {user?.profile?.name?.[0]?.toUpperCase() || '👤'}
                  </span>
                )}
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">
                    <div className="profile-dropdown-name">{user?.profile?.name || 'User'}</div>
                    <div className="profile-dropdown-id">{user?.userId}</div>
                  </div>
                  <div className="profile-dropdown-divider"></div>
                  <button onClick={() => { signOut(); setShowProfileDropdown(false); }} className="profile-dropdown-item">
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {podInfo && activeView === 'home' && (
        <div className="floors-container">
          <div className="floors-scroll">
            <div className="floor-card active">
              <div className="floor-indicator">●</div>
              {podInfo.avatar?.url ? (
                <img src={podInfo.avatar.url} alt="Floor" className="floor-avatar" />
              ) : (
                <div className="floor-icon">🏢</div>
              )}
              <div className="floor-title" title={podInfo.title}>
                {podInfo.title}
              </div>
              <button
                className="edit-floor-btn"
                onClick={() => setShowEditFloorModal(true)}
                title="Edit floor"
              >
                ✏️
              </button>
            </div>
            {/* Additional followed floors will appear here when implemented */}
          </div>
        </div>
      )}

      {activeView === 'home' ? (
        <div className="home-view">
          <div className="greeting-section">
            <h2 className="greeting-text">How may I help you?</h2>
          </div>

          <div className="action-cards-grid">
            <div className="action-card remember-card" onClick={() => setActiveView('create')}>
              <div className="card-icon-wrapper">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14m-7-7h14"></path>
                </svg>
              </div>
              <div className="card-content">
                <h3>Remember This</h3>
                <p>Add content with media to memory</p>
              </div>
            </div>

            <div className="action-card chat-card" onClick={() => setActiveView('query')}>
              <div className="card-icon-wrapper">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="card-content">
                <h3>Chat with Agent</h3>
                <p>Query your stored memories</p>
              </div>
            </div>

            <div className="action-card explore-card" onClick={() => setActiveView('recent')}>
              <div className="card-icon-wrapper">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div className="card-content">
                <h3>Explore Floors</h3>
                <p>Browse your Floor memories</p>
              </div>
            </div>

            <div className="action-card notes-card" onClick={() => setActiveView('notes')}>
              <div className="card-icon-wrapper">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
              <div className="card-content">
                <h3>Take Notes</h3>
                <p>Record voice notes or type manually</p>
              </div>
            </div>

            <div className="action-card recent-events-card" onClick={() => setActiveView('recent')}>
              <div className="card-icon-wrapper">
                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="card-content">
                <h3>Recent Events</h3>
                <p>View your latest activity</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="full-screen-view">
          <div className="view-header">
            <button className="back-btn" onClick={() => setActiveView('home')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7l-7 7 7 7"></path>
              </svg>
              <span>Back</span>
            </button>
            <h2 className="view-title">
              {activeView === 'query' && 'Chat with Agent'}
              {activeView === 'create' && 'Remember This'}
              {activeView === 'notes' && 'Take Notes'}
              {activeView === 'recent' && 'Explore Floors'}
            </h2>
          </div>

          <div className="view-content">
            {activeView === 'query' && <QueryConversation />}
            {activeView === 'create' && <CreateEvent />}
            {activeView === 'notes' && <TakeNotes />}
            {activeView === 'recent' && <RecentEvents />}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>
          Built with <a href="https://docs.xfloor.ai/java-sdk-1930594m0" target="_blank" rel="noopener noreferrer">xFloor Java SDK</a>
        </p>
      </footer>

      {showEditFloorModal && (
        <div className="modal-overlay" onClick={() => setShowEditFloorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Pod Floor</h2>
              <button className="modal-close" onClick={() => setShowEditFloorModal(false)}>×</button>
            </div>

            <form onSubmit={handleEditFloor} className="edit-floor-form">
              <div className="form-group">
                <label htmlFor="floor-title">Floor Title</label>
                <input
                  id="floor-title"
                  type="text"
                  value={editFloorData.title}
                  onChange={(e) => setEditFloorData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={podInfo?.title || 'Enter floor title'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="floor-details">Floor Details</label>
                <textarea
                  id="floor-details"
                  value={editFloorData.details}
                  onChange={(e) => setEditFloorData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder={podInfo?.details || 'Enter floor description'}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="floor-logo">Floor Logo</label>
                <input
                  id="floor-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {editFloorData.logo_file && (
                  <div className="file-preview">
                    Selected: {editFloorData.logo_file.name}
                  </div>
                )}
              </div>

              {editFloorError && (
                <div className="auth-error">
                  {editFloorError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEditFloorModal(false)}
                  disabled={editFloorLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="auth-button"
                  disabled={editFloorLoading || (!editFloorData.title && !editFloorData.details && !editFloorData.logo_file)}
                >
                  {editFloorLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
