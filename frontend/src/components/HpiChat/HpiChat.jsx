import React, { useState, useRef, useEffect, useCallback } from "react";
import { Brain, X, Send, Mic, MicOff, Phone } from "lucide-react";
import "./HpiChat.css";
import { API_BASE_URL as API_URL } from "../../utils/config";
import { getSyncItem } from "../../utils/storage";
import { startListening, stopListening } from "../../utils/speechRecognition";
import { getChatHistory, saveChatHistory, subscribeChatHistory } from "../../utils/chatStorage";
import VapiCallModal from "../VapiCallModal/VapiCallModal";

export default function HpiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [messages, setMessages] = useState(() => getChatHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Subscribe to central chat storage updates (from Vapi voice calls or other components)
  useEffect(() => {
    setMessages(getChatHistory());
    const unsubscribe = subscribeChatHistory((updated) => {
      setMessages(updated);
    });
    return unsubscribe;
  }, []);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Toggle chat panel
  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setError(null);
  }, []);

  // Send message — accepts optional text override (used by voice)
  const sendMessage = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    setInput("");
    setLoading(true);
    setError(null);

    try {
      const tokenVal = getSyncItem("aura_token");
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(tokenVal ? { "Authorization": `Bearer ${tokenVal}` } : {})
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        exercise: data.exercise || null,
      };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (err) {
      setError(err.message || "Failed to reach Hpi. Try again.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Voice Mode ─────────────────────────────────────────────
  const startVoice = useCallback(() => {
    startListening({
      onResult: (transcript) => {
        setInput(transcript);
        setTimeout(() => sendMessage(transcript), 200);
      },
      onError: (err) => {
        console.error("Speech recognition error:", err);
      },
      onStart: () => setListening(true),
      onEnd: () => setListening(false)
    });
  }, [sendMessage]);

  const stopVoice = useCallback(() => {
    stopListening();
    setListening(false);
  }, []);

  return (
    <>
      {/* ── Chat Panel ─────────────────────────────────────── */}
      <div className={`hpi-panel${isOpen ? " open" : ""}`}>
        {/* Header */}
        <div className="hpi-header">
          <div className="hpi-header-icons">
            <Brain />
          </div>
          <span className="hpi-header-title">Hpi AI</span>

          {/* Voice Call Button */}
          <button
            className="hpi-call-header-btn"
            onClick={() => setIsCallOpen(true)}
            aria-label="Start Voice Call"
            title="Start AI Voice Call"
          >
            <Phone size={18} />
          </button>

          <button
            className="hpi-header-close"
            onClick={toggleChat}
            aria-label="Close Hpi chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="hpi-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`hpi-msg ${msg.role}`}>
              <div className="hpi-msg-text">{msg.content}</div>
              
              {/* Exercise GIF / Card display */}
              {msg.exercise && (
                <div className="hpi-exercise-card">
                  <div className="hpi-exercise-card-header">
                    <span className="hpi-exercise-title">{msg.exercise.name}</span>
                    <div className="hpi-exercise-badges">
                      {msg.exercise.category && <span className="hpi-badge cyan">{msg.exercise.category}</span>}
                      {msg.exercise.equipment && <span className="hpi-badge dark">{msg.exercise.equipment}</span>}
                      {msg.exercise.target && <span className="hpi-badge outline">{msg.exercise.target}</span>}
                    </div>
                  </div>

                  {(msg.exercise.gif_url || msg.exercise.image_url) && (
                    <div className="hpi-exercise-media-wrapper">
                      <img
                        src={msg.exercise.gif_url || msg.exercise.image_url}
                        alt={msg.exercise.name}
                        className="hpi-exercise-gif"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {msg.exercise.instructions && (
                    <div className="hpi-exercise-instructions">
                      {typeof msg.exercise.instructions === "string"
                        ? msg.exercise.instructions
                        : Array.isArray(msg.exercise.instructions)
                        ? msg.exercise.instructions.join(" ")
                        : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="hpi-typing">
              <span className="hpi-typing-dot" />
              <span className="hpi-typing-dot" />
              <span className="hpi-typing-dot" />
            </div>
          )}

          {/* Error toast */}
          {error && <div className="hpi-error-toast">{error}</div>}

          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div className="hpi-input-row">
          <input
            ref={inputRef}
            className="hpi-input"
            type="text"
            placeholder="Ask Hpi anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {/* Mic button */}
          <button
            className={`hpi-mic-btn${listening ? " hpi-mic-active" : ""}`}
            onClick={listening ? stopVoice : startVoice}
            aria-label={listening ? "Stop listening" : "Start voice input"}
            disabled={loading}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Direct call button from input row */}
          <button
            className="hpi-mic-btn"
            onClick={() => setIsCallOpen(true)}
            aria-label="Voice call"
            title="Talk with Hpi AI (Voice Call)"
            style={{ color: "#06b6d4", border: "1px solid rgba(6, 182, 212, 0.3)" }}
          >
            <Phone size={18} />
          </button>

          <button
            className="hpi-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            <Send />
          </button>
        </div>
      </div>

      {/* ── Floating Bubble ────────────────────────────────── */}
      <button
        className="hpi-bubble"
        onClick={toggleChat}
        aria-label="Open Hpi AI chat"
      >
        <div className="hpi-bubble-icon">
          <Brain className="hpi-brain" />
        </div>
      </button>

      {/* ── Vapi Voice Call Interface ──────────────────────── */}
      <VapiCallModal isOpen={isCallOpen} onClose={() => setIsCallOpen(false)} />
    </>
  );
}
