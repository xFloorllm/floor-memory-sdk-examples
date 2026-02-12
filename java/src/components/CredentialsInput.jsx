import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function CredentialsInput() {
  const { setCredentials } = useAuth();
  const [bearerToken, setBearerToken] = useState('');
  const [appId, setAppId] = useState('');
  const [podFloorId, setPodFloorId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [floorInfo, setFloorInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFloorInfo(null);

    // Validate inputs
    if (!bearerToken.trim() || !appId.trim() || !podFloorId.trim() || !userId.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const normalizedToken = bearerToken.trim().replace(/^Bearer\s+/i, '');

      // First, temporarily set the token to validate credentials by fetching floor info
      localStorage.setItem('xfloor_token', normalizedToken);
      localStorage.setItem('xfloor_app_id', appId.trim());

      // Fetch floor information to validate credentials and get floor title
      const floorData = await authService.getFloorInfo(
        podFloorId.trim(),
        appId.trim(),
        userId.trim()
      );

      setFloorInfo(floorData);

      // If we got here, credentials are valid - now set them permanently
      await setCredentials({
        bearerToken: normalizedToken,
        appId: appId.trim(),
        podFloorId: podFloorId.trim(),
        userId: userId.trim(),
      });
    } catch (err) {
      // Clear temporary tokens on error
      localStorage.removeItem('xfloor_token');
      localStorage.removeItem('xfloor_app_id');
      const message = err.message || 'Failed to validate credentials. Please check your inputs.';
      if (message.toLowerCase().includes('floor not available')) {
        setError('Floor not available for this App ID/User ID. Check Pod Floor ID, App ID, and User ID.');
      } else {
        setError(message);
      }
      setFloorInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>xFloor Memory SDK Demo Java</h1>
          <p>Enter your credentials to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="bearer-token">Bearer Token</label>
            <input
              id="bearer-token"
              type="password"
              value={bearerToken}
              onChange={(e) => setBearerToken(e.target.value)}
              placeholder="Enter your bearer token"
              required
            />
            <small className="form-help-text">Your API bearer token for authentication (with or without Bearer prefix)</small>
          </div>

          <div className="form-group">
            <label htmlFor="app-id">App ID</label>
            <input
              id="app-id"
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Enter app ID"
              required
            />
            <small className="form-help-text">Your xFloor application ID (13-digit identifier)</small>
          </div>

          <div className="form-group">
            <label htmlFor="pod-floor-id">Pod Floor ID</label>
            <input
              id="pod-floor-id"
              type="text"
              value={podFloorId}
              onChange={(e) => setPodFloorId(e.target.value)}
              placeholder="Enter pod floor ID"
              required
            />
            <small className="form-help-text">The ID of the floor/pod to access</small>
          </div>

          <div className="form-group">
            <label htmlFor="user-id">User ID</label>
            <input
              id="user-id"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              required
            />
            <small className="form-help-text">Your user ID in the system</small>
          </div>

          {floorInfo && (
            <div className="floor-info-preview">
              <div className="floor-info-header">
                <h3>Floor Found</h3>
              </div>
              {floorInfo.avatar?.url ? (
                <img src={floorInfo.avatar.url} alt="Floor" className="floor-preview-avatar" />
              ) : (
                <div className="floor-preview-icon">🏢</div>
              )}
              <div className="floor-preview-title">{floorInfo.title || floorInfo.floor_id}</div>
              {floorInfo.details && (
                <div className="floor-preview-details">{floorInfo.details}</div>
              )}
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Validating credentials...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
