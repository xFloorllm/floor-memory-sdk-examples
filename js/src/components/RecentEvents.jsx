import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecentEventsApi } from '../config/memoryClient';
import { APP_CONFIG } from '../config/appConfig';
import MediaViewer from './MediaViewer';
import { toSafeRichHtml } from '../utils/richText';

export default function RecentEvents() {
  const { user, podInfo } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    fetchRecentEvents();
  }, [podInfo, user]);

  const fetchRecentEvents = async () => {
    if (!podInfo?.floor_id || !user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      // Use SDK's GetRecentEventsApi
      const recentEventsApi = getRecentEventsApi();

      return new Promise((resolve, reject) => {
        recentEventsApi.getRecentEvents(
          podInfo.floor_id,
          APP_CONFIG.APP_ID,
          {
            userId : user.userId
          },
          (error, data) => {
            if (error) {
              setError(error.message || error.response?.text || 'Failed to load events');
              console.error('Fetch events error:', error);
              setLoading(false);
              reject(error);
            } else {
              setEvents(data.items || []);
              setLoading(false);
              resolve(data);
            }
          }
        );
      });
    } catch (err) {
      setError(err.message || 'Failed to load events');
      console.error('Fetch events error:', err);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getMediaIcon = (mediaType) => {
    switch (mediaType) {
      case 'IMAGE': return '🖼️';
      case 'AUDIO': return '🎵';
      case 'VIDEO': return '🎬';
      case 'PDF': return '📄';
      default: return '📎';
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="card">
        <h2>Recent Events</h2>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="recent-events-header">
        <h2>Recent Events</h2>
        <button onClick={fetchRecentEvents} className="refresh-btn" title="Refresh">
          🔄
        </button>
      </div>
      <p className="description">
        View recent posts and updates from your Floor.
      </p>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {events.length === 0 && !loading && (
        <div className="empty-events-state">
          <div className="empty-icon">📭</div>
          <h3>No Events Yet</h3>
          <p>Create your first event to see it here!</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="events-list">
          {events.map((event) => (
            <div key={event.event_id} className="event-card">
              <div className="event-header">
                <div className="event-author">
                  {event.author?.avatar?.url ? (
                    <img
                      src={event.author.avatar.url}
                      alt={event.author.name}
                      className="event-author-avatar"
                    />
                  ) : (
                    <div className="event-author-avatar-placeholder">
                      {event.author?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="event-author-info">
                    <div className="event-author-name">{event.author?.name || 'Unknown'}</div>
                    <div className="event-timestamp">{formatDate(event.created_at_ms)}</div>
                  </div>
                </div>
              </div>

              {event.title && (
                <h3 className="event-title">{event.title}</h3>
              )}

              {event.text && (
                <div
                  className="event-content"
                  dangerouslySetInnerHTML={{ __html: toSafeRichHtml(event.text) }}
                />
              )}

              {event.media && event.media.length > 0 && (
                <div className="event-media">
                  {event.media.map((media, index) => (
                    <div key={index} className="event-media-item">
                      {media.type === 'IMAGE' && (
                        <img
                          src={media.url}
                          alt="Event media"
                          className="event-media-image"
                          loading="lazy"
                          onClick={() => setSelectedMedia(media)}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                      {media.type === 'AUDIO' && (
                        <div
                          className="event-media-player"
                          onClick={() => setSelectedMedia(media)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="media-icon">{getMediaIcon('AUDIO')}</span>
                          <audio controls src={media.url} className="event-audio" onClick={(e) => e.stopPropagation()}>
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                      {media.type === 'VIDEO' && (
                        <video
                          controls
                          src={media.url}
                          className="event-media-video"
                          onClick={() => setSelectedMedia(media)}
                          style={{ cursor: 'pointer' }}
                        >
                          Your browser does not support video playback.
                        </video>
                      )}
                      {media.type === 'PDF' && (
                        <div
                          className="event-media-link"
                          onClick={() => setSelectedMedia(media)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="media-icon">{getMediaIcon(media.type)}</span>
                          <span>View {media.type}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
