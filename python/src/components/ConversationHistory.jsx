import { useState } from 'react';
import { getMemoryClient } from '../config/memoryClient';

export default function ConversationHistory() {
  const [userId, setUserId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [conversations, setConversations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGetConversations = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConversations(null);

    try {
      const client = getMemoryClient();
      const result = await client.getConversations({
        userId,
        floorId,
      });
      setConversations(result);
    } catch (err) {
      setError(err.message || 'Failed to retrieve conversations');
      console.error('Get conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Conversation History</h2>
      <p className="description">
        Retrieve past conversations for a specific user and floor.
      </p>

      <form onSubmit={handleGetConversations}>
        <div className="form-group">
          <label htmlFor="historyUserId">User ID:</label>
          <input
            id="historyUserId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., user_123"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="historyFloorId">Floor ID:</label>
          <input
            id="historyFloorId"
            type="text"
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            placeholder="e.g., floor_456"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Get Conversations'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {conversations && (
        <div className="response">
          <h3>Conversations:</h3>
          {Array.isArray(conversations) && conversations.length === 0 ? (
            <p>No conversations found.</p>
          ) : (
            <pre>{JSON.stringify(conversations, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}
