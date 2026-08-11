import React, { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Send, Mic, MicOff } from "lucide-react";
import { API_BASE_URL as API_URL } from "../../utils/config";
import { getSyncItem } from "../../utils/storage";
import { startListening, stopListening } from "../../utils/speechRecognition";
import { getChatHistory, saveChatHistory, subscribeChatHistory } from "../../utils/chatStorage";

/**
 * Inline version of HpiChat that renders as a card inside the dashboard,
 * always visible (no floating bubble needed).
 */
export default function InlineHpiChat() {
  const [messages, setMessages] = useState(() => getChatHistory());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages(getChatHistory());
    const unsubscribe = subscribeChatHistory((updated) => {
      setMessages(updated);
    });
    return unsubscribe;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

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
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const assistantMsg = { role: "assistant", content: data.reply };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (err) {
      setError(err.message || "Failed to reach Hpi.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const startVoice = useCallback(() => {
    startListening({
      onResult: (transcript) => {
        setInput(transcript);
        setTimeout(() => sendMessage(transcript), 200);
      },
      onError: (err) => {
        console.error("Speech recognition error:", err);
        setError("Voice input failed or denied.");
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
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 20,
      overflow: 'hidden',
      height: '100%',
      minHeight: 400,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(var(--aura-accent-rgb), 0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--aura-accent)',
        }}>
          <Brain size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Hpi AI Coach</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>Always ready to help</div>
        </div>
        <div style={{
          marginLeft: 'auto',
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--aura-accent)',
          boxShadow: '0 0 6px var(--aura-accent)',
        }} />
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            maxWidth: '82%',
            padding: '10px 14px',
            borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            fontSize: 13.5,
            lineHeight: 1.55,
            wordWrap: 'break-word',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user'
              ? 'linear-gradient(135deg, rgba(var(--aura-accent-rgb), 0.25) 0%, rgba(var(--aura-accent-rgb), 0.1) 100%)'
              : 'var(--color-surface-h)',
            border: msg.role === 'user'
              ? '1px solid rgba(var(--aura-accent-rgb), 0.2)'
              : '1px solid var(--color-border)',
            color: 'var(--color-text)',
            animation: 'hpi-msg-in 0.25s ease',
          }}>
            <div dangerouslySetInnerHTML={{ __html: msg.content }} />
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '12px 16px', alignSelf: 'flex-start',
            background: 'var(--color-surface-h)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px 14px 14px 4px',
          }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--aura-accent)', opacity: 0.5,
                animation: `hpi-dot-bounce 1.2s infinite ease-in-out ${i * 0.15}s`,
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(var(--aura-accent-rgb), 0.08)',
            border: '1px solid rgba(var(--aura-accent-rgb), 0.18)',
            borderRadius: 10, fontSize: 12,
            color: 'var(--aura-accent3)', textAlign: 'center',
          }}>{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 14px',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask Hpi anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-input, var(--color-border))',
            borderRadius: 12, padding: '10px 14px',
            fontFamily: 'inherit', fontSize: 13.5,
            color: 'var(--color-text)', outline: 'none',
          }}
        />
        <button
          onClick={listening ? stopVoice : startVoice}
          disabled={loading}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: listening ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: listening ? '#EF4444' : 'var(--color-text-3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: 'none', background: 'var(--aura-accent)',
            color: 'var(--color-on-accent)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!input.trim() || loading) ? 0.35 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
