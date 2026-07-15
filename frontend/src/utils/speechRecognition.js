import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNative = Capacitor.isNativePlatform();

let recognitionInstance = null;
let nativeListener = null;

export async function isAvailable() {
  if (isNative) {
    try {
      const { available } = await SpeechRecognition.available();
      return !!available;
    } catch (e) {
      console.error('SpeechRecognition.available check failed', e);
      return false;
    }
  }
  return !!("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
}

export async function startListening({ onResult, onError, onStart, onEnd }) {
  const available = await isAvailable();
  if (!available) {
    if (onError) onError(new Error("Speech recognition is not supported on this device."));
    return;
  }

  if (isNative) {
    try {
      const { permission } = await SpeechRecognition.hasPermission();
      if (!permission) {
        await SpeechRecognition.requestPermission();
      }
      
      if (onStart) onStart();
      
      // Remove any existing listeners first
      if (nativeListener) {
        await nativeListener.remove();
        nativeListener = null;
      }

      // Add listener to capture results
      nativeListener = await SpeechRecognition.addListener("partialResults", (data) => {
        if (data && data.matches && data.matches.length > 0) {
          onResult(data.matches[0]);
        }
      });

      // Start Capacitor Speech Recognition
      await SpeechRecognition.start({
        language: "en-US",
        partialResults: true,
        popup: false // We use our own UI in the chat
      });

    } catch (e) {
      console.error("Capacitor speech recognition error:", e);
      if (onError) onError(e);
      if (onEnd) onEnd();
    }
  } else {
    // Browser Speech Recognition
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionInstance = new SR();
      recognitionInstance.lang = "en-US";
      recognitionInstance.interimResults = false;
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        if (onStart) onStart();
      };
      recognitionInstance.onend = () => {
        if (onEnd) onEnd();
      };
      recognitionInstance.onerror = (e) => {
        console.error("Speech recognition error:", e);
        if (onError) onError(e);
        if (onEnd) onEnd();
      };
      recognitionInstance.onresult = (e) => {
        if (e.results && e.results[0] && e.results[0][0]) {
          const transcript = e.results[0][0].transcript;
          onResult(transcript);
        }
      };
      recognitionInstance.start();
    } catch (e) {
      console.error("Browser speech recognition error:", e);
      if (onError) onError(e);
      if (onEnd) onEnd();
    }
  }
}

export async function stopListening() {
  if (isNative) {
    try {
      await SpeechRecognition.stop();
      if (nativeListener) {
        await nativeListener.remove();
        nativeListener = null;
      }
    } catch (e) {
      console.error("Error stopping Capacitor speech recognition:", e);
    }
  } else {
    if (recognitionInstance) {
      recognitionInstance.stop();
      recognitionInstance = null;
    }
  }
}
