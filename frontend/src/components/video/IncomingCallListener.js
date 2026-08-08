import React, { useState, useEffect, useRef } from 'react';
import { Video, PhoneCall, PhoneOff, User } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/config';
import { token } from '../../utils/api';
import VideoCallScreen from './VideoCallScreen';

/**
 * IncomingCallListener
 *
 * Polls the backend for incoming call invites. When one is found:
 * - Shows a ringing popup with Accept / Decline buttons.
 * - On Accept: mounts <VideoCallScreen mode="callee" /> which calls join()
 *   exactly once inside the Accept handler path.
 * - Filters out invites where callerId === currentUserId so the caller
 *   never sees their own call as incoming.
 */
export default function IncomingCallListener() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);

  const currentUserId = token.userId();

  // Track whether we're already showing an active call to avoid re-polling noise
  const activeCallRef = useRef(null);
  activeCallRef.current = activeCallSession;

  useEffect(() => {
    if (!currentUserId) return;

    let isSubscribed = true;

    const checkIncomingCalls = async () => {
      // Don't poll if we're already in an active call session
      if (activeCallRef.current) return;

      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/stream/invite/check?userId=${currentUserId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (!isSubscribed) return;

        if (data.active && data.invite) {
          // ── CRITICAL FILTER: ignore calls created by the current user ──
          // This prevents the caller from seeing their own outgoing call
          // as an "incoming" notification.
          if (String(data.invite.callerId) === String(currentUserId)) {
            console.log('[INCOMING_LISTENER] Ignored own call invite (caller === currentUser)');
            setIncomingCall(null);
            return;
          }

          console.log('[INCOMING_LISTENER] Incoming call detected from:', data.invite.callerName);
          setIncomingCall(data.invite);
        } else {
          // Invite was cancelled, declined, or expired — dismiss popup
          setIncomingCall(null);
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    };

    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentUserId]);
  // NOTE: removed activeCallSession and incomingCall from deps to prevent
  // re-creating the interval on every state change.

  // ── Accept handler: the ONLY place the callee transitions to the call ──
  // This sets activeCallSession which mounts <VideoCallScreen mode="callee" />.
  // VideoCallScreen's useEffect will call call.join() exactly once.
  const handleAccept = async () => {
    if (!incomingCall) return;
    console.log('[CALLEE_ACCEPT] User accepted incoming call:', incomingCall.callId);

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/stream/invite/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: incomingCall.callId,
          receiverId: String(currentUserId),
          action: 'accept',
        }),
      });
    } catch (err) {
      console.error('[CALLEE_ACCEPT] Error responding to invite:', err);
    }

    // Mount the call screen in 'callee' mode — this triggers join() once
    setActiveCallSession(incomingCall);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    console.log('[CALLEE_DECLINE] User declined incoming call:', incomingCall.callId);

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/stream/invite/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: incomingCall.callId,
          receiverId: String(currentUserId),
          action: 'decline',
        }),
      });
    } catch (err) {
      console.error('[CALLEE_DECLINE] Error declining call:', err);
      // Still dismiss the popup on error
    }
    setIncomingCall(null);
  };

  return (
    <>
      {/* 1. Incoming Ringing Call Notification Popup */}
      {incomingCall && !activeCallSession && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="incoming-call-avatar-wrap">
              <div className="pulse-ring"></div>
              <div className="pulse-ring-outer"></div>
              <div className="avatar-box" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {incomingCall.callerAvatar ? (
                  <img
                    src={incomingCall.callerAvatar}
                    alt={incomingCall.callerName || 'Caller'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <User size={32} color="#6366f1" />
                )}
              </div>
            </div>

            <div className="incoming-call-info">
              <div className="call-badge">
                <Video size={14} /> INCOMING VIDEO CALL
              </div>
              <h3 className="caller-name">{incomingCall.callerName || 'Coach'}</h3>
              <p className="call-subtitle">is inviting you to a 1:1 Video Session...</p>
            </div>

            <div className="incoming-call-actions">
              <button className="btn-decline-call" onClick={handleDecline} title="Decline Call">
                <PhoneOff size={20} /> Decline
              </button>
              <button className="btn-accept-call" onClick={handleAccept} title="Accept Call">
                <PhoneCall size={20} /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Active Video Call Screen — mounted ONLY after explicit Accept */}
      {activeCallSession && (
        <VideoCallScreen
          athleteId={activeCallSession.athleteId}
          coachId={activeCallSession.coachId}
          currentUserId={currentUserId}
          userRole={String(currentUserId) === String(activeCallSession.coachId) ? 'coach' : 'athlete'}
          mode="callee"  /* ← CALLEE: join() only, no getOrCreate, no invite signal */
          onCallEnd={() => {
            console.log('[CALLEE_END] Call ended, clearing session.');
            setActiveCallSession(null);
          }}
        />
      )}
    </>
  );
}
