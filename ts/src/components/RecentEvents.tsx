import { useEffect, useState } from 'react';
import type { GetRecentEvents200ResponseItemsInner, Media } from '@xfloor/floor-memory-sdk-ts';
import { useAuth } from '../context/AuthContext';
import { getRecentEventsApi, getActiveAppId } from '../config/memoryClient';
import MediaViewer from './MediaViewer';

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function RecentEvents() {
  const { user, podInfo } = useAuth();
  const [events, setEvents] = useState<GetRecentEvents200ResponseItemsInner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);

  useEffect(() => {
    void fetchRecentEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podInfo?.floorId, user?.userId]);

  const fetchRecentEvents = async () => {
    if (!podInfo?.floorId || !user?.userId) return;

    setLoading(true);
    setError(null);

    try {
      const recentEventsApi = getRecentEventsApi();
      const data = await recentEventsApi.getRecentEvents({
        floorId: podInfo.floorId,
        appId: getActiveAppId(),
        userId: user.userId,
      });

      setEvents(data.items || []);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load events'));
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(Number.parseInt(timestamp, 10));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'IMAGE':
        return '🖼️';
      case 'AUDIO':
        return '🎵';
      case 'VIDEO':
        return '🎬';
      case 'PDF':
        return '📄';
      default:
        return '📎';
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
      <p className="description">View recent posts and updates from your Floor.</p>

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
            <div key={event.eventId || `${event.title}-${event.createdAtMs}`} className="event-card">
              <div className="event-header">
                <div className="event-author">
                  {event.author?.avatar?.url ? (
                    <img src={event.author.avatar.url} alt={event.author.name} className="event-author-avatar" />
                  ) : (
                    <div className="event-author-avatar-placeholder">{event.author?.name?.[0]?.toUpperCase() || '?'}</div>
                  )}
                  <div className="event-author-info">
                    <div className="event-author-name">{event.author?.name || 'Unknown'}</div>
                    <div className="event-timestamp">{formatDate(event.createdAtMs)}</div>
                  </div>
                </div>
              </div>

              {event.title && <h3 className="event-title">{event.title}</h3>}

              {event.text && <div className="event-content">{event.text}</div>}

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

      {selectedMedia && <MediaViewer media={selectedMedia} onClose={() => setSelectedMedia(null)} />}
    </div>
  );
}
