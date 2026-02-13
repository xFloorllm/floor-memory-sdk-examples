import { useState, useRef, useEffect } from 'react';
import { getQueryApi } from '../config/memoryClient';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { toSafeRichHtml } from '../utils/richText';

const SCROLL_THRESHOLD_PX = 120;

export default function QueryConversation() {
  const { user, podInfo } = useAuth();
  const [userId, setUserId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const isNearBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return true;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD_PX;
  };

  const scrollToBottom = (behavior = 'smooth') => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  // Initialize user_id and floor_id from auth context
  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId);
    }
    if (user?.floorId || podInfo?.floor_id) {
      setFloorId(user.floorId || podInfo.floor_id);
    }
  }, [user, podInfo]);

  useEffect(() => {
    if (isPinnedToBottom) {
      const behavior = messages.length <= 1 ? 'auto' : 'smooth';
      scrollToBottom(behavior);
    }
  }, [messages, loading, isPinnedToBottom]);

  const handleMessagesScroll = () => {
    setIsPinnedToBottom(isNearBottom());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const normalizedUserId = userId.trim();
    const normalizedFloorId = floorId.trim();

    if (!normalizedUserId || !normalizedFloorId) {
      const validationMessage = {
        id: Date.now(),
        type: 'error',
        content: 'user_id and floor_id are required before sending a query.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, validationMessage]);
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setIsPinnedToBottom(true);
    setMessages(prev => [...prev, userMessage]);
    const queryText = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      // Use SDK's QueryApi
      const queryApi = getQueryApi();

      const queryRequest = {
        user_id: normalizedUserId,
        query: queryText,
        floor_ids: [normalizedFloorId],
        k: 5,
        include_metadata: '1',
        summary_needed: '1',
        app_id: APP_CONFIG.APP_ID
      };

      return new Promise((resolve, reject) => {
        queryApi.query(queryRequest, (error, data) => {
          if (error) {
            const errorMessage = {
              id: Date.now() + 1,
              type: 'error',
              content: error.message || error.response?.text || 'Failed to query conversation',
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
            console.error('Query error:', error);
            setLoading(false);
            reject(error);
          } else {
            // When summary_needed is '1', extract only the answer string
            let answerContent;
            if (typeof data === 'string' && data.trim()) {
              answerContent = data;
            } else if (data.answer && typeof data.answer === 'string' && data.answer.trim()) {
              answerContent = data.answer;
            } else if (data.summary && typeof data.summary === 'string' && data.summary.trim()) {
              answerContent = data.summary;
            } else {
              // No answer available
              answerContent = 'No information available for this query.';
            }

            const aiMessage = {
              id: Date.now() + 1,
              type: 'assistant',
              content: answerContent,
              timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMessage]);
            setLoading(false);
            resolve(data);
          }
        });
      });
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: err.message || 'Failed to query conversation',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Query error:', err);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setIsPinnedToBottom(true);
    setMessages([]);
  };

  return (
    <div className="chat-container">
      {/* Clear Chat Button - Top Right */}
      <div className="chat-header-minimal">
        <button
          type="button"
          onClick={clearChat}
          className="clear-chat-icon"
          title="Clear chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>

      {/* Chat Messages Area */}
      <div
        className="chat-messages"
        ref={chatContainerRef}
        onScroll={handleMessagesScroll}
      >
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
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-text">
                {typeof message.content === 'string' ? (
                  message.type === 'assistant' ? (
                    <div
                      className="rich-content"
                      dangerouslySetInnerHTML={{ __html: toSafeRichHtml(message.content) }}
                    />
                  ) : (
                    message.content
                  )
                ) : (
                  <pre className="json-response">{JSON.stringify(message.content, null, 2)}</pre>
                )}
              </div>
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

      {!isPinnedToBottom && messages.length > 0 && (
        <button
          type="button"
          className="scroll-to-latest-btn"
          onClick={() => {
            setIsPinnedToBottom(true);
            scrollToBottom('smooth');
          }}
          title="Scroll to latest messages"
          aria-label="Scroll to latest messages"
        >
          ↓
        </button>
      )}

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            rows="1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="send-btn"
            title="Send message"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  );
}
