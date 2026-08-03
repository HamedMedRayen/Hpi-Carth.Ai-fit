// Helper for Vapi AI Web SDK integration
import Vapi from "@vapi-ai/web";
import { API_BASE_URL } from "./config";

const STORAGE_KEY_PUBLIC_KEY = "vapi_public_key";
const STORAGE_KEY_ASSISTANT_ID = "vapi_assistant_id";

let cachedPublicKey = "";
let cachedAssistantId = "";

export function getVapiCredentials() {
  const publicKey =
    cachedPublicKey ||
    localStorage.getItem(STORAGE_KEY_PUBLIC_KEY) ||
    process.env.REACT_APP_VAPI_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPI_API_KEY ||
    "";

  const assistantId =
    cachedAssistantId ||
    localStorage.getItem(STORAGE_KEY_ASSISTANT_ID) ||
    process.env.REACT_APP_VAPI_ASSISTANT_ID ||
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ||
    "";

  return { publicKey, assistantId };
}


export async function fetchVapiCredentials() {
  // First check synchronous cached / localStorage / process.env
  let creds = getVapiCredentials();
  if (creds.publicKey && creds.assistantId) {
    return creds;
  }

  // Fetch from backend .env via API
  try {
    const res = await fetch(`${API_BASE_URL}/vapi/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.public_key) cachedPublicKey = data.public_key;
      if (data.assistant_id) cachedAssistantId = data.assistant_id;
      return getVapiCredentials();
    }
  } catch (err) {
    console.warn("Could not fetch vapi config from backend:", err);
  }

  return creds;
}

export function setVapiCredentials(publicKey, assistantId) {
  if (publicKey !== undefined) {
    cachedPublicKey = publicKey.trim();
    localStorage.setItem(STORAGE_KEY_PUBLIC_KEY, publicKey.trim());
  }
  if (assistantId !== undefined) {
    cachedAssistantId = assistantId.trim();
    localStorage.setItem(STORAGE_KEY_ASSISTANT_ID, assistantId.trim());
  }
}

let vapiInstance = null;
let currentKey = null;

export function getVapiInstance(publicKey) {
  if (!publicKey) return null;
  if (!vapiInstance || currentKey !== publicKey) {
    try {
      vapiInstance = new Vapi(publicKey);
      currentKey = publicKey;
    } catch (err) {
      console.error("Failed to instantiate Vapi:", err);
      return null;
    }
  }
  return vapiInstance;
}
