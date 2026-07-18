import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, MessageSquare, Trash2 } from "lucide-react";
import { api } from "../utils/api";
import { useAuth } from "../utils/auth";

export default function CoachChatModal({ recipient, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (recipient) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000); // Poll every 5s
      return () => clearInterval(interval);
    }
  }, [recipient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const data = await api.getMessages(recipient.id || recipient.athlete_id || recipient.coach_id);
      setMessages(data);
    } catch (e) {
      console.error("Failed to fetch messages", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage;
    setNewMessage("");

    try {
      const sent = await api.sendMessage(recipient.id || recipient.athlete_id || recipient.coach_id, msgText);
      setMessages(prev => [...prev, sent]);
    } catch (e) {
      console.error("Failed to send message", e);
    }
  };

  const handleClearChat = async () => {
    const recipientId = recipient.id || recipient.athlete_id || recipient.coach_id;
    if (!recipientId) return;

    if (!window.confirm("Are you sure you want to clear this conversation? This will delete all messages for both you and the other user. This action cannot be undone.")) {
      return;
    }

    try {
      await api.clearConversation(recipientId);
      setMessages([]);
    } catch (e) {
      console.error("Failed to clear conversation", e);
    }
  };

  if (!recipient) return null;

  const recipientName = recipient.name || recipient.coach_name || "User";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
      padding: 20
    }}>
      <div style={{
        width: "100%", maxWidth: 500, height: "80vh",
        background: "var(--bg-glass)", border: "1px solid var(--border-card)",
        borderRadius: 24, display: "flex", flexDirection: "column",
        overflow: "hidden", animation: "modalIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-card)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(255,255,255,0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: "var(--bg-card)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--aura-accent)", overflow: "hidden"
            }}>
              {(recipient.avatar_url || recipient.coach_avatar) ? (
                <img src={recipient.avatar_url || recipient.coach_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={20} color="var(--aura-accent)" />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--color-text)" }}>{recipientName}</div>
              <div style={{ fontSize: 11, color: "#22C55E", fontWeight: 700 }}>Online</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button 
              onClick={handleClearChat} 
              title="Clear Conversation"
              style={{
                background: "rgba(255,255,255,0.05)", border: "none", color: "var(--color-text)",
                width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#EF4444"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text)"}
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.05)", border: "none", color: "var(--color-text)",
              width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer"
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto", padding: 20,
            display: "flex", flexDirection: "column", gap: 12
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-3)" }}>Loading history...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-3)" }}>
              <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>No messages yet. Start the conversation!</div>
            </div>
          ) : messages.map(m => {
            const isMe = m.sender_id === (user?.id || user?.user_id);
            return (
              <div key={m.id} style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                maxWidth: "80%",
                display: "flex", flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start"
              }}>
                <div style={{
                  padding: "10px 16px", borderRadius: isMe ? "18px 18px 2px 18px" : "18px 18px 18px 2px",
                  background: isMe ? "var(--aura-accent)" : "var(--bg-card)",
                  color: isMe ? "#000" : "var(--color-text)",
                  fontSize: 14, fontWeight: isMe ? 600 : 400,
                  border: isMe ? "none" : "1px solid var(--border-card)",
                  boxShadow: isMe ? "0 4px 15px rgba(var(--aura-accent-rgb), 0.3)" : "none"
                }}>
                  {m.message}
                </div>
                <div style={{ fontSize: 9, color: "var(--color-text-3)", marginTop: 4, textTransform: "uppercase", fontWeight: 700 }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{
          padding: 20, borderTop: "1px solid var(--border-card)",
          display: "flex", gap: 12, background: "rgba(255,255,255,0.01)"
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="themed-input"
            style={{ flex: 1, height: 48, borderRadius: 14, padding: "0 16px" }}
          />
          <button type="submit" className="btn-primary" style={{
            width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0
          }}>
            <Send size={18} />
          </button>
        </form>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
