// Central reactive storage manager for Hpi AI Chat history

const STORAGE_KEY = "hpi_chat_history_v1";
const EVENT_NAME = "hpi-chat-updated";

const DEFAULT_WELCOME = {
  role: "assistant",
  content: "Hey, I'm Hpi 👋 Your AI fitness coach. Ask me anything or tap the call icon to talk live!",
};

/**
 * Retrieve saved chat history array from localStorage.
 */
export function getChatHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_WELCOME];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn("Error reading hpi_chat_history from storage:", e);
  }
  return [DEFAULT_WELCOME];
}

/**
 * Save full chat history array to localStorage and notify all subscribers.
 */
export function saveChatHistory(messages) {
  try {
    if (Array.isArray(messages)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: messages }));
    }
  } catch (e) {
    console.warn("Error saving hpi_chat_history to storage:", e);
  }
}

/**
 * Append one message to saved chat history and trigger update event.
 */
export function addChatMessage(message) {
  const current = getChatHistory();
  // Prevent exact duplicate consecutive messages
  const last = current[current.length - 1];
  if (last && last.role === message.role && last.content.trim() === message.content.trim()) {
    return current;
  }
  const next = [...current, message];
  saveChatHistory(next);
  return next;
}

/**
 * Append multiple messages (e.g. from Vapi voice call session) to chat history.
 */
export function addChatMessages(newMessages) {
  if (!Array.isArray(newMessages) || newMessages.length === 0) return getChatHistory();
  const current = getChatHistory();
  const filteredNew = newMessages.filter((nm) => nm.content && nm.content.trim());
  if (filteredNew.length === 0) return current;

  const next = [...current, ...filteredNew];
  saveChatHistory(next);
  return next;
}

/**
 * Subscribe to chat history updates.
 * @param {Function} callback Callback receiving updated messages array.
 * @returns {Function} Unsubscribe cleanup function.
 */
export function subscribeChatHistory(callback) {
  const handler = (e) => {
    if (e && e.detail) {
      callback(e.detail);
    } else {
      callback(getChatHistory());
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", handler);
  };
}

/**
 * Clear stored chat history and reset to welcome message.
 */
export function clearChatHistory() {
  saveChatHistory([DEFAULT_WELCOME]);
}
