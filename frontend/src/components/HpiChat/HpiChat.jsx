import React, { useState, useRef, useEffect, useCallback } from "react";
import { Brain, X, Send, Mic, MicOff } from "lucide-react";
import "./HpiChat.css";
import { API_BASE_URL as API_URL } from "../../utils/config";
import { getSyncItem } from "../../utils/storage";
import { startListening, stopListening } from "../../utils/speechRecognition";

const WELCOME_MSG = {
  role: "assistant",
  content: "Hey, I'm Hpi \u{1F44B} Your AI fitness coach. Ask me anything about your training.",
};

export default function HpiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasOpened, setHasOpened] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

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
    setIsOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && !hasOpened) {
        setMessages([WELCOME_MSG]);
        setHasOpened(true);
      }
      return willOpen;
    });
    setError(null);
  }, [hasOpened]);

  // Send message — accepts optional text override (used by voice)
  const sendMessage = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
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
          <span className="hpi-header-title">Hpi</span>
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
              {msg.content}
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
            placeholder="Ask Hpi anything\u2026"
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
    </>
  );
}
