import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEventApi } from '../config/memoryClient';
import { APP_CONFIG } from '../config/appConfig';

export default function CreateEvent() {
  const { user, podInfo } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentMediaType, setCurrentMediaType] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [selectedFiles]);

  const getMediaCategory = (fileType) => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType === 'application/pdf') return 'pdf';
    return 'other';
  };

  const handleFileSelect = (e, mediaType) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newFileCategory = mediaType || getMediaCategory(files[0].type);

    // If switching to a different media type, clear existing files
    if (currentMediaType && currentMediaType !== newFileCategory) {
      setSelectedFiles(files.slice(0, 4));
      setCurrentMediaType(newFileCategory);
      setError(null);
      return;
    }

    // If same type or first selection, add files (max 4 total)
    setSelectedFiles(prev => {
      const combined = [...prev, ...files];
      const limited = combined.slice(0, 4);
      if (combined.length > 4) {
        setError('Maximum 4 files allowed. Only the first 4 files were selected.');
        setTimeout(() => setError(null), 3000);
      }
      return limited;
    });
    setCurrentMediaType(newFileCategory);
  };

  const handleMediaTypeClick = (mediaType) => {
    if (currentMediaType && currentMediaType !== mediaType) {
      // Clear current media when switching types
      setSelectedFiles([]);
      setCurrentMediaType(null);
      setError(null);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setCurrentMediaType(null);
      }
      return newFiles;
    });
  };

  const getFileIcon = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎬';
    if (type === 'application/pdf') return '📄';
    return '📎';
  };

  const getFileType = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.startsWith('video/')) return 'Video';
    if (type === 'application/pdf') return 'PDF';
    return 'File';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    // Validate that at least one field is filled
    if (!title && !description && selectedFiles.length === 0) {
      setError('Please provide at least a title, description, or media file');
      return;
    }

    if (!podInfo?.floor_id) {
      setError('floor_id is required before creating an event.');
      return;
    }

    const normalizedUserId = typeof user?.userId === 'string' ? user.userId.trim() : '';
    if (!normalizedUserId) {
      setError('user_id is required before creating an event.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Get first block from pod info
      const blockId = podInfo?.blocks?.[0]?.bid || '';

      // Create input_info JSON
      const inputInfo = {
        floor_id: podInfo.floor_id,
        block_type: '0', // Default post type
        block_id: blockId,
        user_id: normalizedUserId,
        title: title || '',
        description: description || ''
      };

      const inputInfoString = JSON.stringify(inputInfo);

      // Create files object for SDK
      const filesObject = {};
      if (selectedFiles.length > 0) {
        // SDK expects files as an object with keys like 'files'
        filesObject.files = selectedFiles;
      }

      // Use SDK's EventApi
      const eventApi = getEventApi();

      return new Promise((resolve, reject) => {
        eventApi.event(inputInfoString, APP_CONFIG.APP_ID, filesObject, (error, data) => {
          if (error) {
            setError(error.message || error.response?.text || 'Failed to create event');
            console.error('Create event error:', error);
            setLoading(false);
            reject(error);
          } else {
            setResponse(data);

            // Clear form on success
            setTitle('');
            setDescription('');
            setSelectedFiles([]);
            setCurrentMediaType(null);
            setLoading(false);
            resolve(data);
          }
        });
      });
    } catch (err) {
      setError(err.message || 'Failed to create event');
      console.error('Create event error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create Event</h2>
      <p className="description">
        Add content to your Floor with optional media attachments (images, audio, PDF, video).
        Share updates, notes, or reminders that become part of your memory base.
      </p>

      <form onSubmit={handleCreateEvent} className="create-event-form">
        <div className="form-group">
          <label htmlFor="eventTitle">Title (Optional)</label>
          <input
            id="eventTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="eventDescription">Description (Optional)</label>
          <textarea
            id="eventDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Event content or description..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Media Attachments</label>
          <p className="media-subtitle">Add images, audio, video, or PDF files (max 4 of same type)</p>

          <div className="media-upload-section">
            <div className="media-type-buttons">
              <label
                htmlFor="imageFiles"
                className={`media-type-btn ${currentMediaType === 'image' ? 'active' : ''}`}
                onClick={() => handleMediaTypeClick('image')}
              >
                <div className="media-btn-content">
                  <svg className="media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span className="media-label">Image</span>
                </div>
                <input
                  id="imageFiles"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'image')}
                  style={{ display: 'none' }}
                />
              </label>

              <label
                htmlFor="audioFiles"
                className={`media-type-btn ${currentMediaType === 'audio' ? 'active' : ''}`}
                onClick={() => handleMediaTypeClick('audio')}
              >
                <div className="media-btn-content">
                  <svg className="media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                  <span className="media-label">Audio</span>
                </div>
                <input
                  id="audioFiles"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleFileSelect(e, 'audio')}
                  style={{ display: 'none' }}
                />
              </label>

              <label
                htmlFor="videoFiles"
                className={`media-type-btn ${currentMediaType === 'video' ? 'active' : ''}`}
                onClick={() => handleMediaTypeClick('video')}
              >
                <div className="media-btn-content">
                  <svg className="media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <span className="media-label">Video</span>
                </div>
                <input
                  id="videoFiles"
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, 'video')}
                  style={{ display: 'none' }}
                />
              </label>

              <label
                htmlFor="pdfFiles"
                className={`media-type-btn ${currentMediaType === 'pdf' ? 'active' : ''}`}
                onClick={() => handleMediaTypeClick('pdf')}
              >
                <div className="media-btn-content">
                  <svg className="media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <span className="media-label">PDF</span>
                </div>
                <input
                  id="pdfFiles"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e, 'pdf')}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="media-selection-status">
                <span className="status-icon">✓</span>
                <span className="status-text">{selectedFiles.length} of 4 files selected</span>
              </div>
            )}
          </div>

          {selectedFiles.length > 0 && (
            <div className="media-preview-grid">
              {selectedFiles.map((file, index) => {
                const fileType = file.type;
                const isImage = fileType.startsWith('image/');
                const isVideo = fileType.startsWith('video/');
                const isAudio = fileType.startsWith('audio/');
                const fileUrl = URL.createObjectURL(file);

                return (
                  <div key={index} className="media-preview-item">
                    <div className="media-preview-header">
                      <span className="media-icon">{getFileIcon(file)}</span>
                      <span className="media-type-badge">{getFileType(file)}</span>
                      <button
                        type="button"
                        className="media-remove-btn"
                        onClick={() => removeFile(index)}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>

                    {isImage && (
                      <div className="media-preview-thumbnail">
                        <img src={fileUrl} alt={file.name} />
                      </div>
                    )}

                    {isVideo && (
                      <div className="media-preview-thumbnail">
                        <video src={fileUrl} controls />
                      </div>
                    )}

                    {isAudio && (
                      <div className="media-preview-audio">
                        <audio src={fileUrl} controls />
                      </div>
                    )}

                    <div className="media-preview-info">
                      <div className="media-filename" title={file.name}>
                        {file.name}
                      </div>
                      <div className="media-filesize">{formatFileSize(file.size)}</div>
                    </div>
                  </div>
                );
              })}

              {currentMediaType && selectedFiles.length < 4 && (
                <label
                  htmlFor={`add${currentMediaType}Files`}
                  className="media-add-box"
                  title={`Add more ${currentMediaType} files`}
                >
                  <div className="add-box-icon-wrapper">
                    <svg className="media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <span className="add-box-text">Add More</span>
                  <input
                    id={`add${currentMediaType}Files`}
                    type="file"
                    accept={
                      currentMediaType === 'image' ? 'image/*' :
                      currentMediaType === 'audio' ? 'audio/*' :
                      currentMediaType === 'video' ? 'video/*' :
                      '.pdf'
                    }
                    onChange={(e) => handleFileSelect(e, currentMediaType)}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="uploading-animation">
            <div className="upload-spinner"></div>
            <span>Uploading...</span>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="success">
          <h3>Event Created Successfully!</h3>
          <p>Your event has been queued for processing and will appear in Recent Events shortly.</p>
        </div>
      )}
    </div>
  );
}
