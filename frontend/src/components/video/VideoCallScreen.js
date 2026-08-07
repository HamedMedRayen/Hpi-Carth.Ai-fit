import React, { useState, useEffect, useRef } from 'react';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  useCallStateHooks,
  CallingState,
  ParticipantView,
  useCall,
} from '@stream-io/video-react-sdk';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, User } from 'lucide-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './VideoCallModal.css';
import { getApiBaseUrl } from '../../utils/config';
import { token } from '../../utils/api';

// =============================================================================
// Timeout helper
// =============================================================================
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT: ${label} did not resolve within ${ms / 1000}s`)), ms)
    ),
  ]);
}

function ts() {
  return new Date().toISOString().slice(11, 23);
}

// =============================================================================
// CustomCallUI
// =============================================================================
const CustomCallUI = ({ onCallEnd, title, recipientName = 'Participant' }) => {
  const call = useCall();
  const { useCallCallingState, useMicrophoneState, useCameraState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { isMute: isMicMuted } = useMicrophoneState();
  const { isMute: isCamMuted } = useCameraState();

  const seen = new Set();
  const dedupedParticipants = participants.filter((p) => {
    if (!p || seen.has(p.userId)) return false;
    seen.add(p.userId);
    return true;
  });

  const localParticipant = dedupedParticipants.find((p) => p.isLocalParticipant);
  const remoteParticipants = dedupedParticipants.filter((p) => !p.isLocalParticipant);

  const toggleMic = async () => {
    try { if (call) await call.microphone.toggle(); }
    catch (e) { console.error('[CALL_UI] mic error:', e); }
  };

  const toggleCam = async () => {
    try { if (call) await call.camera.toggle(); }
    catch (e) { console.error('[CALL_UI] cam error:', e); }
  };

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="stream-call-container">
        <div className="stream-call-body">
          <div className="calling-waiting-state">
            <div className="spinner-large"></div>
            <h3 className="calling-title" style={{ marginTop: 20 }}>Connecting...</h3>
            <p className="calling-subtitle">Setting up video session ({callingState || 'initializing'})</p>
          </div>
        </div>
      </div>
    );
  }

  const isLive = remoteParticipants.length > 0;

  return (
    <div className="stream-call-container">
      <div className="stream-call-header">
        <div className="call-info">
          <span className={`live-indicator ${isLive ? 'connected' : 'ringing'}`}>
            <span className="live-dot"></span> {isLive ? 'LIVE' : 'RINGING'}
          </span>
          <h3>{title || '1:1 Athlete & Coach Call'}</h3>
        </div>
        <div className="participant-badge">
          👥 {dedupedParticipants.length} Participant{dedupedParticipants.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="stream-call-body">
        {isLive ? (
          <div className="participants-grid grid-count-2">
            {dedupedParticipants.map((p) => (
              <div key={p.sessionId || p.userId} className="participant-card">
                <ParticipantView participant={p} />
                <div className="participant-label">
                  <span>{p.name || p.userId || 'User'}</span>
                  {p.isLocalParticipant && <span className="you-tag">(You)</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="calling-waiting-state">
            <div className="calling-avatar-wrap">
              <div className="calling-pulse"></div>
              <div className="calling-pulse-outer"></div>
              <div className="calling-avatar">
                <User size={48} color="#818cf8" />
              </div>
            </div>
            <h3 className="calling-title">Calling {recipientName}...</h3>
            <p className="calling-subtitle">Waiting for {recipientName} to accept the call...</p>

            {localParticipant && (
              <div className="local-preview-card">
                <ParticipantView participant={localParticipant} />
                <span className="preview-tag">Your Camera</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="stream-call-footer">
        <div className="call-controls-bar">
          <button className={`control-btn ${isMicMuted ? 'muted' : 'active'}`} onClick={toggleMic}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}>
            {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button className={`control-btn ${isCamMuted ? 'muted' : 'active'}`} onClick={toggleCam}
            title={isCamMuted ? 'Turn Camera On' : 'Turn Camera Off'}>
            {isCamMuted ? <VideoOff size={20} /> : <VideoIcon size={20} />}
            <span>{isCamMuted ? 'Cam Off' : 'Cam On'}</span>
          </button>
          <button className="control-btn btn-end-call" onClick={onCallEnd} title="End Call">
            <PhoneOff size={20} />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// VideoCallScreen
// =============================================================================
export const VideoCallScreen = ({
  athleteId,
  coachId,
  currentUserId,
  currentUserName = 'User',
  userRole = 'athlete',
  mode = 'caller',
  onCallEnd,
}) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Refs that survive StrictMode remount ──
  // React 18 StrictMode: mount → unmount → remount.
  // Local variables (isMounted) die on first unmount. Refs persist.
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const clientRef = useRef(null);
  const callRef = useRef(null);

  const callId = `athlete-${athleteId}-coach-${coachId}`;
  const apiKey =
    process.env.REACT_APP_STREAM_API_KEY ||
    process.env.NEXT_PUBLIC_STREAM_API_KEY ||
    'zgeq5ef43ya7';

  useEffect(() => {
    // Mark as mounted (critical for StrictMode second mount)
    isMountedRef.current = true;

    // If init already started (from first mount), just return cleanup.
    // The running init() will check isMountedRef.current (now true again)
    // and correctly set state when it completes.
    if (hasInitializedRef.current) {
      console.log(`[${ts()}][${mode.toUpperCase()}] Remount detected — init already running, skipping.`);
      return () => {
        console.log(`[${ts()}][${mode.toUpperCase()}_CLEANUP] Unmounting.`);
        isMountedRef.current = false;
        // Clean up resources using refs (populated by the async init)
        if (callRef.current) {
          callRef.current.leave().catch((e) => console.error('[CLEANUP] leave:', e));
          callRef.current = null;
        }
        if (clientRef.current) {
          clientRef.current.disconnectUser().catch((e) => console.error('[CLEANUP] disconnect:', e));
          clientRef.current = null;
        }
        // Cancel invite
        try {
          const apiBase = getApiBaseUrl();
          fetch(`${apiBase}/stream/invite/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callId }),
          }).catch(() => {});
        } catch (e) {}
      };
    }
    hasInitializedRef.current = true;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        const resolvedUserId = String(
          currentUserId || token.userId() || (userRole === 'coach' ? coachId : athleteId) || 'user'
        );
        const authToken = token.get() || localStorage.getItem('token') || '';
        const apiBase = getApiBaseUrl();

        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] userId="${resolvedUserId}" athleteId="${athleteId}" coachId="${coachId}" callId="${callId}"`);

        // STEP 1: Fetch Stream token
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 1: Fetching token...`);
        const res = await withTimeout(
          fetch(`${apiBase}/stream/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authToken ? `Bearer ${authToken}` : '',
            },
            body: JSON.stringify({
              userId: resolvedUserId,
              role: userRole,
              athleteId: String(athleteId),
              coachId: String(coachId),
            }),
          }),
          15000, 'Fetch token'
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || errData.error || `Token server returned ${res.status}`);
        }
        const data = await res.json();
        if (!data.token) throw new Error('No token returned from backend.');
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 1 ✅ Token OK`);

        // STEP 2: Create client
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 2: Creating client...`);
        const videoClient = new StreamVideoClient({ apiKey });

        // STEP 3: connectUser
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 3: connectUser("${resolvedUserId}")...`);
        await withTimeout(
          videoClient.connectUser(
            { id: resolvedUserId, name: currentUserName || (userRole === 'coach' ? 'Coach' : 'Athlete') },
            data.token
          ),
          15000, 'connectUser()'
        );
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 3 ✅ Connected`);

        // Store in refs immediately so cleanup can access them
        clientRef.current = videoClient;

        // STEP 4: Create call reference
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 4: Creating call ref...`);
        const activeCall = videoClient.call('default', callId);
        callRef.current = activeCall;

        // STEP 5: Join call
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 5: join({ create: true })...`);
        await withTimeout(activeCall.join({ create: true }), 15000, 'call.join()');
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] STEP 5 ✅ Joined!`);

        // STEP 6 (CALLER ONLY): Send invite
        if (mode === 'caller') {
          const targetReceiverId = String(
            String(resolvedUserId) === String(athleteId) ? coachId : athleteId
          );
          console.log(`[${ts()}][CALLER_INIT] STEP 6: Invite → "${targetReceiverId}"...`);
          try {
            await withTimeout(
              fetch(`${apiBase}/stream/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callerId: resolvedUserId,
                  callerName: currentUserName || (userRole === 'coach' ? 'Coach' : 'Athlete'),
                  receiverId: targetReceiverId,
                  athleteId: String(athleteId),
                  coachId: String(coachId),
                }),
              }),
              10000, 'Send invite'
            );
            console.log(`[${ts()}][CALLER_INIT] STEP 6 ✅ Invite sent`);
          } catch (inviteErr) {
            console.warn(`[${ts()}][CALLER_INIT] STEP 6 ⚠️ Non-blocking:`, inviteErr.message);
          }
        }

        // ── SET STATE ──
        // Use isMountedRef (a ref, not a local var) so it reflects the
        // CURRENT mount state even after StrictMode unmount+remount.
        console.log(`[${ts()}][${mode.toUpperCase()}_INIT] 🎉 DONE. isMounted=${isMountedRef.current}`);
        if (isMountedRef.current) {
          setClient(videoClient);
          setCall(activeCall);
          setLoading(false);
          console.log(`[${ts()}][${mode.toUpperCase()}_INIT] ✅ State updated — UI should render call.`);
        } else {
          console.warn(`[${ts()}][${mode.toUpperCase()}_INIT] Component unmounted — skipping state update, cleaning up.`);
          activeCall.leave().catch(() => {});
          videoClient.disconnectUser().catch(() => {});
        }
      } catch (err) {
        console.error(`[${ts()}][${mode.toUpperCase()}_INIT] ❌ FAILED:`, err.message);
        if (isMountedRef.current) {
          setError(err.message || 'Failed to connect to video call.');
          setLoading(false);
        }
        if (callRef.current) { callRef.current.leave().catch(() => {}); callRef.current = null; }
        if (clientRef.current) { clientRef.current.disconnectUser().catch(() => {}); clientRef.current = null; }
      }
    };

    if (currentUserId || athleteId) {
      init();
    } else {
      setError('Missing required call parameters.');
      setLoading(false);
    }

    return () => {
      console.log(`[${ts()}][${mode.toUpperCase()}_CLEANUP] Unmounting.`);
      isMountedRef.current = false;
      // Don't clean up resources here if init is still running —
      // the refs are null at this point. The second mount's cleanup
      // (or the init's own error handler) will handle it.
    };
  }, []);

  const handleEndCall = async () => {
    console.log(`[${ts()}][${mode.toUpperCase()}_END] Ending call.`);
    try {
      const apiBase = getApiBaseUrl();
      await fetch(`${apiBase}/stream/invite/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
      });
    } catch (e) {}

    if (callRef.current) {
      try { await callRef.current.leave(); } catch (e) { console.error('[END] leave:', e); }
      callRef.current = null;
    }
    if (clientRef.current) {
      try { await clientRef.current.disconnectUser(); } catch (e) { console.error('[END] disconnect:', e); }
      clientRef.current = null;
    }
    if (onCallEnd) onCallEnd();
  };

  if (loading) {
    return (
      <div className="video-call-modal-overlay">
        <div className="video-call-card loading-card">
          <div className="spinner-large"></div>
          <h3>Connecting Video Session...</h3>
          <p>Setting up {mode === 'caller' ? 'outgoing' : 'incoming'} call...</p>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Check console (F12) for progress</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-call-modal-overlay">
        <div className="video-call-card error-card">
          <div className="error-icon">⚠️</div>
          <h3>Call Connection Error</h3>
          <p className="error-text">{error}</p>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onCallEnd}>Cancel</button>
            <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-modal-overlay">
      <div className="video-call-window">
        {client && call && (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CustomCallUI
                onCallEnd={handleEndCall}
                title="1:1 Session — Athlete & Coach"
                recipientName={userRole === 'coach' ? 'Athlete' : 'Coach'}
              />
            </StreamCall>
          </StreamVideo>
        )}
      </div>
    </div>
  );
};

export default VideoCallScreen;
