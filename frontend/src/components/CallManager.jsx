import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../api/axios';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN servers for mobile network relay
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

function createRingTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    const play = () => {
      if (stopped) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.frequency.setValueAtTime(620, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1);
      } catch {}
      if (!stopped) setTimeout(play, 1800);
    };
    play();
    return {
      stop: () => {
        stopped = true;
        try { ctx.close(); } catch {}
      }
    };
  } catch { return { stop: () => {} }; }
}

const EndIcon    = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08C.11 12.9 0 12.65 0 12.38c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>;
const PhoneIcon  = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>;
const VideoIcon  = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>;
const MicOffIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>;
const MicOnIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const CamOffIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21 6.5l-4-4-15 15 1.41 1.41L7 15.41V19c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V8c0-.69-.36-1.29-.9-1.64L21 6.5zm-1 12.5H9.41l3.95-3.95c.21.03.42.05.64.05 2.21 0 4-1.79 4-4 0-.22-.02-.43-.05-.64L19 9.41V19zM3.27 2L2 3.27 4.73 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h11c.55 0 1.05-.22 1.41-.59l1.32 1.32L19 20.73 3.27 2z"/></svg>;
const CamOnIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>;
const SpeakerIcon= () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>;

export default function CallManager() {
  const { user } = useAuth();
  const { socketRef } = useSocket();  // ← destructure correctly

  const [callState,    setCallState]    = useState('idle'); // idle | calling | incoming | active
  const [callType,     setCallType]     = useState('audio');
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [remoteId,     setRemoteId]     = useState(null);
  const [mentorshipId, setMentorshipId] = useState(null);
  const [muted,        setMuted]        = useState(false);
  const [camOff,       setCamOff]       = useState(false);
  const [speaker,      setSpeaker]      = useState(true);
  const [duration,     setDuration]     = useState(0);

  const pcRef          = useRef(null);
  const localStream    = useRef(null);
  const remoteStream   = useRef(null); // store remote stream until video element mounts
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef       = useRef(null);
  const ringRef        = useRef(null);
  const pendingOffer   = useRef(null);
  const pendingFromId  = useRef(null);
  const callStateRef   = useRef('idle');
  const remoteIdRef    = useRef(null);
  const mentorshipRef  = useRef(null);
  const callTypeRef    = useRef('audio');
  const durationRef    = useRef(0);

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { remoteIdRef.current = remoteId; }, [remoteId]);
  useEffect(() => { mentorshipRef.current = mentorshipId; }, [mentorshipId]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const cleanup = useCallback(() => {
    // Stop ring FIRST before anything else
    if (ringRef.current) {
      ringRef.current.stop();
      ringRef.current = null;
    }
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    remoteStream.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    clearInterval(timerRef.current);
    setCallState('idle');
    setDuration(0);
    setMuted(false);
    setCamOff(false);
    setRemoteUser(null);
    setRemoteId(null);
    setMentorshipId(null);
    pendingOffer.current  = null;
    pendingFromId.current = null;
  }, []);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const getMedia = async (type) => {
    const constraints = type === 'video'
      ? { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } }
      : { audio: true, video: false };
    return navigator.mediaDevices.getUserMedia(constraints);
  };

  const buildPC = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit('call:ice', { to: targetId, candidate });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      remoteStream.current = stream;
      // Attach immediately if video element already mounted
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce?.();
      }
    };
    return pc;
  }, [socketRef, cleanup]);

  // Attach local + remote video whenever state/type changes (video elements just mounted)
  useEffect(() => {
    const attach = () => {
      if (localVideoRef.current && localStream.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      // Attach remote stream if it arrived before the element mounted
      if (remoteVideoRef.current && remoteStream.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }
    };
    attach();
    // Retry after DOM settles
    const t1 = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [callState, callType]);

  // Expose startCall globally
  useEffect(() => {
    window.__startCall = (targetId, targetUser, type = 'audio', mshipId = null) => {
      if (callStateRef.current !== 'idle') return;
      setRemoteUser(targetUser);
      setRemoteId(targetId);
      setCallType(type);
      setMentorshipId(mshipId);
      initiateCall(targetId, type, mshipId);
    };
    return () => { delete window.__startCall; };
  }, [socketRef?.current]);

  const initiateCall = async (targetId, type, mshipId) => {
    try {
      const stream = await getMedia(type);
      localStream.current = stream;
      const pc = buildPC(targetId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pcRef.current = pc;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('call:initiate', {
        to: targetId,
        from: user?._id || user?.id,
        fromUser: {
          _id:         user?._id || user?.id,
          firstName:   user?.firstName,
          lastName:    user?.lastName,
          avatar:      user?.avatar || '',
          role:        user?.role,
          designation: user?.designation || '',
          company:     user?.company || '',
        },
        callType: type,
        offer,
      });
      setCallState('calling');
      ringRef.current = createRingTone();

      // ── Send push notification to wake up recipient if their socket is dead ──
      if (mshipId) {
        import('../api/axios').then(({ default: api }) => {
          api.post(`/messages/call-push/${mshipId}`, { callType: type }).catch(() => {});
        });
      }
    } catch (err) {
      alert('Could not access microphone/camera. Please allow permissions in your browser.');
      cleanup();
    }
  };

  const answerCall = async () => {
    // Stop ring immediately
    if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
    try {
      const stream = await getMedia(callTypeRef.current);
      localStream.current = stream;
      const pc = buildPC(pendingFromId.current);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pcRef.current = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('call:answer', { to: pendingFromId.current, answer });
      setRemoteId(pendingFromId.current);
      setCallState('active');
      startTimer();
    } catch (err) {
      alert('Could not access microphone/camera: ' + err.message);
      cleanup();
    }
  };

  const rejectCall = () => {
    // Stop ring immediately
    if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
    socketRef.current?.emit('call:reject', { to: pendingFromId.current });
    if (mentorshipRef.current) {
      api.post(`/messages/${mentorshipRef.current}/call`, { callType: callTypeRef.current, status: 'rejected', duration: 0 }).catch(() => {});
    }
    cleanup();
  };

  const endCall = () => {
    const to = remoteIdRef.current || pendingFromId.current;
    const dur = durationRef.current;
    const state = callStateRef.current;
    socketRef.current?.emit('call:end', { to });
    if (mentorshipRef.current) {
      const status = state === 'calling' ? 'missed' : 'ended';
      api.post(`/messages/${mentorshipRef.current}/call`, { callType: callTypeRef.current, status, duration: dur }).catch(() => {});
    }
    cleanup();
  };

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleCam = () => {
    localStream.current?.getVideoTracks().forEach(t => { t.enabled = camOff; });
    setCamOff(c => !c);
  };

  // Socket listeners
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const onIncoming = async ({ from, fromUser, callType: ct, offer }) => {
      if (callStateRef.current !== 'idle') {
        socketRef.current?.emit('call:reject', { to: from });
        return;
      }
      pendingOffer.current  = offer;
      pendingFromId.current = from;
      setCallType(ct);
      setCallState('incoming');

      // Use fromUser data sent directly — no API call needed
      if (fromUser?.firstName) {
        setRemoteUser(fromUser);
      } else {
        // Fallback: fetch if not provided
        try {
          const res = await api.get(`/users/${from}`);
          setRemoteUser(res.data);
        } catch {}
      }

      // Stop any existing ring before starting new one
      if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
      ringRef.current = createRingTone();
    };

    const onAnswered = async ({ answer }) => {
      // Stop ring immediately
      if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch {}
      setCallState('active');
      startTimer();
    };

    const onIce = async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };

    const onRejected = () => {
      if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
      cleanup();
    };
    const onEnded = () => {
      if (ringRef.current) { ringRef.current.stop(); ringRef.current = null; }
      cleanup();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:answered', onAnswered);
    socket.on('call:ice',      onIce);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended',    onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:answered', onAnswered);
      socket.off('call:ice',      onIce);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended',    onEnded);
    };
  }, [socketRef?.current]);

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay">

      {/* ── INCOMING CALL ── */}
      {callState === 'incoming' && (
        <div className="call-modal">
          <div className="call-pulse" />
          <div className="call-pulse call-pulse-2" />
          <Avatar user={remoteUser} size={90} fontSize="1.8rem"
            style={{ borderRadius: '50%', border: '4px solid rgba(255,255,255,.3)', position: 'relative', zIndex: 2 }} />
          <div className="call-name">{remoteUser?.firstName} {remoteUser?.lastName}</div>
          <div className="call-label">{callType === 'video' ? 'Video' : 'Voice'} call…</div>
          <div className="call-actions">
            <div className="call-action-wrap">
              <button className="call-btn call-btn-reject" onClick={rejectCall}>
                <EndIcon />
              </button>
              <span className="call-btn-label">Decline</span>
            </div>
            <div className="call-action-wrap">
              <button className="call-btn call-btn-accept" onClick={answerCall}>
                {callType === 'video' ? <VideoIcon /> : <PhoneIcon />}
              </button>
              <span className="call-btn-label">Accept</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CALLING / ACTIVE ── */}
      {(callState === 'calling' || callState === 'active') && (
        <div className={`call-modal${callType === 'video' ? ' call-modal-video' : ''}`}>

          {callType === 'video' ? (
            <>
              <video
                ref={el => {
                  remoteVideoRef.current = el;
                  // Attach stream immediately when element mounts
                  if (el && remoteStream.current) el.srcObject = remoteStream.current;
                }}
                autoPlay playsInline className="call-video-remote"
              />
              <video
                ref={el => {
                  localVideoRef.current = el;
                  if (el && localStream.current) el.srcObject = localStream.current;
                }}
                autoPlay playsInline muted className="call-video-local"
              />
              <div className="call-video-overlay">
                <div className="call-name">{remoteUser?.firstName} {remoteUser?.lastName}</div>
                <div className="call-label">{callState === 'calling' ? 'Calling…' : fmt(duration)}</div>
              </div>
            </>
          ) : (
            <>
              <div className="call-audio-bg" />
              {callState === 'active' && <><div className="call-pulse" /><div className="call-pulse call-pulse-2" /></>}
              <Avatar user={remoteUser} size={100} fontSize="2rem"
                style={{ borderRadius: '50%', border: '4px solid rgba(255,255,255,.25)', position: 'relative', zIndex: 2 }} />
              <div className="call-name">{remoteUser?.firstName} {remoteUser?.lastName}</div>
              <div className="call-label">{callState === 'calling' ? 'Calling…' : fmt(duration)}</div>
            </>
          )}

          {/* Controls */}
          <div className="call-controls">
            <div className="call-ctrl-wrap">
              <button className={`call-ctrl-btn${muted ? ' active' : ''}`} onClick={toggleMute}>
                {muted ? <MicOffIcon /> : <MicOnIcon />}
              </button>
              <span className="call-ctrl-label">{muted ? 'Unmute' : 'Mute'}</span>
            </div>

            <div className="call-ctrl-wrap">
              <button className="call-ctrl-btn call-ctrl-end" onClick={endCall}>
                <EndIcon />
              </button>
              <span className="call-ctrl-label">End</span>
            </div>

            {callType === 'video' && (
              <div className="call-ctrl-wrap">
                <button className={`call-ctrl-btn${camOff ? ' active' : ''}`} onClick={toggleCam}>
                  {camOff ? <CamOffIcon /> : <CamOnIcon />}
                </button>
                <span className="call-ctrl-label">{camOff ? 'Cam on' : 'Cam off'}</span>
              </div>
            )}

            <div className="call-ctrl-wrap">
              <button className={`call-ctrl-btn${!speaker ? ' active' : ''}`} onClick={() => setSpeaker(s => !s)}>
                <SpeakerIcon />
              </button>
              <span className="call-ctrl-label">Speaker</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
