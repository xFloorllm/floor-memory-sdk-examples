import { useState, useRef, useEffect } from 'react';

export default function MediaViewer({ media, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const maxZoom = 5;
  const minZoom = 1;
  const zoomStep = 0.5;

  // Reset zoom and pan when media changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [media]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + zoomStep, maxZoom));
    setPan({ x: 0, y: 0 });
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - zoomStep, minZoom));
    setPan({ x: 0, y: 0 });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Limit pan to reasonable bounds
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const maxPan = (zoom - 1) * 100;
        setPan({
          x: Math.max(-maxPan, Math.min(maxPan, newX)),
          y: Math.max(-maxPan, Math.min(maxPan, newY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media.url;
    link.download = `media-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMediaTypeLabel = (type) => {
    switch (type) {
      case 'IMAGE': return 'Image';
      case 'AUDIO': return 'Audio';
      case 'VIDEO': return 'Video';
      case 'PDF': return 'PDF';
      default: return 'Media';
    }
  };

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Header with controls */}
        <div className="media-viewer-header">
          <div className="media-viewer-title">
            {getMediaTypeLabel(media.type)}
          </div>

          <div className="media-viewer-controls">
            {media.type === 'IMAGE' && (
              <>
                <button
                  className="media-control-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoom >= maxZoom}
                >
                  🔍+
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button
                  className="media-control-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoom <= minZoom}
                >
                  🔍−
                </button>
                {zoom > 1 && (
                  <button
                    className="media-control-btn"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                  >
                    ↺
                  </button>
                )}
              </>
            )}

            <button
              className="media-control-btn download-btn"
              onClick={handleDownload}
              title={`Download ${getMediaTypeLabel(media.type)}`}
            >
              ⬇
            </button>

            <button
              className="media-control-btn close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media display area */}
        <div
          className="media-viewer-content"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
        >
          {media.type === 'IMAGE' && (
            <img
              src={media.url}
              alt="Enlarged media"
              className="media-viewer-image"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease'
              }}
              draggable="false"
            />
          )}

          {media.type === 'VIDEO' && (
            <video
              src={media.url}
              controls
              className="media-viewer-video"
              autoPlay
            >
              Your browser does not support video playback.
            </video>
          )}

          {media.type === 'AUDIO' && (
            <div className="media-viewer-audio">
              <div className="audio-icon">🎵</div>
              <audio src={media.url} controls autoPlay />
            </div>
          )}

          {media.type === 'PDF' && (
            <div className="media-viewer-pdf">
              <iframe
                src={media.url}
                className="pdf-iframe"
                title="PDF Viewer"
              />
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="media-viewer-footer">
          <span className="media-info">Click image to pan when zoomed. Use +/- to zoom or scroll wheel.</span>
        </div>
      </div>
    </div>
  );
}
