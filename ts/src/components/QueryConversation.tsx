import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { getQueryApi, getActiveAppId } from '../config/memoryClient';
import { useAuth } from '../context/AuthContext';

type MessageType = 'user' | 'assistant' | 'error';

type ChatMessage = {
  id: number;
  type: MessageType;
  content: string;
  timestamp: string;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export default function QueryConversation() {
  const { user, podInfo } = useAuth();
  const [userId, setUserId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId);
    }

    if (user?.floorId || podInfo?.floorId) {
      setFloorId(user?.floorId || podInfo?.floorId || '');
    }
  }, [user, podInfo]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inputValue.trim() || loading || !userId || !floorId) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryText = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      const queryApi = getQueryApi();
      const data = await queryApi.query({
        queryRequest: {
          userId,
          query: queryText,
          floorIds: [floorId],
          includeMetadata: '1',
          summaryNeeded: '1',
          appId: getActiveAppId(),
        },
      });

      const answerContent =
        typeof data.answer === 'string' && data.answer.trim()
          ? data.answer
          : 'No information available for this query.';

      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: answerContent,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: toErrorMessage(err, 'Failed to query conversation'),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="chat-container">
      <div className="chat-header-minimal">
        <button type="button" onClick={clearChat} className="clear-chat-icon" title="Clear chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Start a Conversation</h3>
            <p>Ask a question to interact with the xFloor Memory SDK</p>
            <div className="example-queries">
              <p>Try asking:</p>
              <ul>
                <li>"What did we discuss last time?"</li>
                <li>"Tell me about recent events"</li>
                <li>"What do you know about this floor?"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : message.type === 'error' ? '⚠️' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-role">
                  {message.type === 'user' ? 'You' : message.type === 'error' ? 'Error' : 'AI Assistant'}
                </span>
                <span className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="message-text">{message.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant typing">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-role">AI Assistant</span>
              </div>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
          />
          <button type="submit" disabled={!inputValue.trim() || loading} className="send-btn" title="Send message">
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
