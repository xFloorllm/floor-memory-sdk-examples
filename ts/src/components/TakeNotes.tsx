import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { createEventWithFiles, getActiveAppId } from '../config/memoryClient';

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function TakeNotes() {
  const { user, podInfo } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<unknown>(null);
  const [audioSupported, setAudioSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setAudioSupported(false);
      setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }

      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!audioSupported || !recognitionRef.current) return;

    setError(null);
    setIsRecording(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const clearTranscript = () => {
    setTranscript('');
    setTitle('');
    setResponse(null);
    setError(null);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!transcript.trim()) {
      setError('Please record or enter some notes before saving.');
      return;
    }

    if (!podInfo?.floorId || !user?.userId) {
      setError('No floor information available. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const blockId = podInfo.blocks?.[0]?.blockId || '';

      const inputInfo = {
        floor_id: podInfo.floorId,
        block_type: '0',
        block_id: blockId,
        user_id: user.userId,
        title: title || 'Voice Note',
        description: transcript,
      };

      const data = await createEventWithFiles(JSON.stringify(inputInfo), getActiveAppId(), []);
      setResponse(data);
      setTitle('');
      setTranscript('');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to save notes'));
      console.error('Save notes error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Take Notes</h2>
      <p className="description">Record voice notes using audio transcription or type your notes manually.</p>

      <form onSubmit={handleSave} className="notes-form">
        <div className="form-group">
          <label htmlFor="note-title">Title (Optional)</label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your note"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="note-content">Notes</label>
          <textarea
            id="note-content"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Click the microphone to start recording or type your notes here..."
            rows={8}
            disabled={loading}
          />
        </div>

        {audioSupported && (
          <div className="audio-controls">
            <button
              type="button"
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isRecording ? (
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                ) : (
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" />
                )}
              </svg>
              <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
            </button>

            {transcript && (
              <button
                type="button"
                className="clear-btn"
                onClick={clearTranscript}
                disabled={loading || isRecording}
                title="Clear notes"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Clear
              </button>
            )}
          </div>
        )}

        {isRecording && (
          <div className="recording-indicator">
            <div className="pulse-dot"></div>
            <span>Recording... Speak now</span>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {response && (
          <div className="success">
            <h3>Notes Saved Successfully!</h3>
            <p>Your notes have been saved and will appear in Recent Events.</p>
          </div>
        )}

        <button type="submit" disabled={loading || !transcript.trim() || isRecording}>
          {loading ? 'Saving...' : 'Save Notes'}
        </button>
      </form>
    </div>
  );
}
