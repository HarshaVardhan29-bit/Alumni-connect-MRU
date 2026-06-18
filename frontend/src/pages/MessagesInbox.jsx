import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashLayout from '../components/DashLayout';
import Avatar from '../components/Avatar';
import api from '../api/axios';

const SendIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const MicIcon   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const StopIcon  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>;
const PlusIcon  = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const EmojiIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const PhoneIcon = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const VideoIcon = () => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const SearchIcon= () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const PeopleIcon= () => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;

const EMOJIS = ['😀','😂','🥰','😎','🤔','👍','🔥','💡','🎉','🚀','💪','🙌','✨','💯','🎯','🤝','📚','💼','🌟','❤️'];

// Convert emoji char to Twemoji CDN URL (72x72 PNG)
const toTwemoji = (emoji) => {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${cp}.png`;
};

// Twemoji image component
const TwEmoji = ({ emoji, size = 28 }) => (
  <img
    src={toTwemoji(emoji)}
    alt={emoji}
    width={size}
    height={size}
    style={{ imageRendering: 'auto', display: 'block' }}
    onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
  />
);
const ATTACH_MENU = [
  { key:'doc',   label:'Document',       icon:'📄', color:'#7c45b8', accept:'.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.csv,.zip' },
  { key:'img',   label:'Photos & Videos',icon:'🖼️', color:'#0095f6', accept:'image/*,video/*' },
  { key:'audio', label:'Audio',          icon:'🎵', color:'#f97316', accept:'audio/*' },
];
const fmtSize = b => b>1048576?`${(b/1048576).toFixed(1)} MB`:`${(b/1024).toFixed(0)} KB`;
const fmtDur  = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const fmtTime = d => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const WAVE_H  = Array.from({length:20},()=>8+Math.floor(Math.random()*16));
const GROUP_EMOJIS = ['👥','🎓','💼','🚀','💡','🌟','🏆','📚','🤝','🌐','💻','🎯'];

/* ── Message Bubble ── */
function MsgBubble({ msg, mine }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef();
  if (msg.type==='call') {
    const missed = msg.callMeta?.status==='missed'||msg.callMeta?.status==='rejected';
    return <div className={`mc-call-bubble ${missed?'missed':'ended'}`}><span>{missed?'📵':msg.callMeta?.callType==='video'?'📹':'📞'}</span><span>{msg.text}</span></div>;
  }
  if (msg.type==='voice') return (
    <div className={`mc-bubble ${mine?'mine':'theirs'} mc-voice`}>
      <audio ref={audioRef} src={msg.attachment?.url} onEnded={()=>setPlaying(false)}/>
      <button className="mc-voice-play" onClick={()=>{if(playing){audioRef.current?.pause();setPlaying(false);}else{audioRef.current?.play();setPlaying(true);}}}>{playing?<StopIcon/>:<MicIcon/>}</button>
      <div className="mc-voice-wave">{WAVE_H.map((h,i)=><div key={i} className="mc-wave-bar" style={{height:h}}/>)}</div>
      <span className="mc-voice-dur">{fmtDur(msg.attachment?.duration||0)}</span>
    </div>
  );
  if (msg.type==='image') return (
    <div className={`mc-bubble ${mine?'mine':'theirs'} mc-media`}>
      <img src={msg.attachment?.url} alt="" className="mc-img" onClick={()=>window.open(msg.attachment?.url)}/>
      {msg.text&&<div className="mc-caption">{msg.text}</div>}
    </div>
  );
  if (msg.type==='video') return (
    <div className={`mc-bubble ${mine?'mine':'theirs'} mc-media`}>
      <video src={msg.attachment?.url} controls className="mc-video"/>
      {msg.text&&<div className="mc-caption">{msg.text}</div>}
    </div>
  );
  if (msg.type==='file'||msg.type==='audio') return (
    <div className={`mc-bubble ${mine?'mine':'theirs'} mc-file`}>
      <div className="mc-file-icon">{msg.type==='audio'?'🎵':'📄'}</div>
      <div className="mc-file-info">
        <div className="mc-file-name">{msg.attachment?.name||'File'}</div>
        <div className="mc-file-size">{msg.attachment?.size?fmtSize(msg.attachment.size):''}</div>
        {msg.type==='audio'&&<audio src={msg.attachment?.url} controls className="mc-audio-player"/>}
      </div>
      <a href={msg.attachment?.url} download={msg.attachment?.name} className="mc-file-dl" onClick={e=>e.stopPropagation()}>⬇</a>
    </div>
  );
  return <div className={`mc-bubble ${mine?'mine':'theirs'}`}>{msg.text}</div>;
}

/* ── Poll Modal ── */
function PollModal({ onClose, onSend }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);
  const addOption = () => options.length < 6 && setOptions(o => [...o, '']);
  const setOpt = (i, v) => setOptions(o => o.map((x, idx) => idx === i ? v : x));
  const removeOpt = (i) => options.length > 2 && setOptions(o => o.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!question.trim()) return;
    const validOpts = options.filter(o => o.trim());
    if (validOpts.length < 2) return;
    onSend({
      text: `📊 **${question}**\n${validOpts.map((o, i) => `${i + 1}. ${o}`).join('\n')}`,
      type: 'text',
    });
    onClose();
  };

  return (
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal" onClick={e => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h3>📊 Create Poll</h3>
          <button className="mc-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mc-fg">
          <label>Question</label>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question…" autoFocus/>
        </div>
        <div style={{ marginBottom: '.8rem' }}>
          <label style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', display: 'block', marginBottom: '.5rem' }}>Options</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '.4rem', marginBottom: '.4rem', alignItems: 'center' }}>
              <input
                className="mc-fg"
                style={{ flex: 1, padding: '.6rem .8rem', background: 'var(--surface-3)', border: '1.5px solid var(--border-sub)', borderRadius: '8px', color: 'var(--ink)', fontFamily: 'DM Sans,sans-serif', fontSize: '.88rem', outline: 'none' }}
                value={opt}
                onChange={e => setOpt(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <button onClick={() => removeOpt(i)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,.15)', color: '#ef4444', cursor: 'pointer', fontSize: '.9rem' }}>✕</button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button onClick={addOption} style={{ fontSize: '.82rem', color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer', padding: '.3rem 0', fontFamily: 'DM Sans,sans-serif' }}>
              + Add option
            </button>
          )}
        </div>
        <button className="mc-modal-submit" onClick={submit} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>
          Send Poll
        </button>
      </div>
    </div>
  );
}

/* ── Location Modal ── */
function LocationModal({ onClose, onSend }) {
  const [loading, setLoading] = useState(false);
  const [coords,  setCoords]  = useState(null);
  const [city,    setCity]    = useState('');
  const [error,   setError]   = useState('');

  const getLocation = () => {
    setLoading(true); setError('');
    navigator.geolocation?.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords(c);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${c.latitude}&lon=${c.longitude}&format=json`);
          const d = await r.json();
          setCity(d.display_name?.split(',').slice(0, 3).join(', ') || 'Your location');
        } catch { setCity(`${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`); }
        setLoading(false);
      },
      () => { setError('Location access denied. Please allow location in browser settings.'); setLoading(false); }
    );
  };

  const sendLocation = (live = false) => {
    if (!coords) return;
    const mapsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
    onSend({
      text: `📍 ${live ? '🔴 Live Location' : 'Current Location'}\n${city}\n${mapsUrl}`,
      type: 'text',
    });
    onClose();
  };

  return (
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal" onClick={e => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h3>📍 Share Location</h3>
          <button className="mc-modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div style={{ color: '#f87171', fontSize: '.82rem', marginBottom: '.8rem', padding: '.6rem', background: 'rgba(239,68,68,.1)', borderRadius: '8px' }}>{error}</div>}

        {!coords ? (
          <button className="mc-modal-submit" onClick={getLocation} disabled={loading}>
            {loading ? 'Getting location…' : '📍 Get My Location'}
          </button>
        ) : (
          <>
            {/* Map preview */}
            <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--border-sub)' }}>
              <iframe
                title="map"
                width="100%" height="200"
                style={{ border: 'none', display: 'block' }}
                src={`https://maps.google.com/maps?q=${coords.latitude},${coords.longitude}&z=15&output=embed`}
              />
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '1rem', padding: '.5rem .7rem', background: 'var(--surface-3)', borderRadius: '8px' }}>
              📍 {city}
            </div>
            <div style={{ display: 'flex', gap: '.6rem' }}>
              <button className="mc-modal-submit" style={{ flex: 1 }} onClick={() => sendLocation(false)}>
                📍 Send Location
              </button>
              <button className="mc-modal-submit" style={{ flex: 1, background: 'linear-gradient(135deg,#ef4444,#f97316)' }} onClick={() => sendLocation(true)}>
                🔴 Live Location
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Chat Input ── */
function ChatInput({ onSend, placeholder, disabled: inputDisabled, onTyping }) {
  const [text, setText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const mrRef = useRef(); const chunks = useRef([]); const timer = useRef(); const attachRef = useRef();

  useEffect(() => {
    const h = e => { if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    await onSend({ text, type: 'text' });
    setText('');
  };

  const pickFile = accept => {
    setShowAttach(false);
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept;
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const mime = f.type;
        const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';
        onSend({ text: '', type, attachment: { url: ev.target.result, name: f.name, size: f.size, mimeType: mime } });
      };
      reader.readAsDataURL(f);
    };
    inp.click();
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const dur = recSec;
        const reader = new FileReader();
        reader.onload = ev => onSend({ text: '', type: 'voice', attachment: { url: ev.target.result, name: `voice-${Date.now()}.webm`, size: blob.size, mimeType: 'audio/webm', duration: dur } });
        reader.readAsDataURL(blob);
        setRecSec(0);
      };
      mr.start(); mrRef.current = mr; setRecording(true);
      timer.current = setInterval(() => setRecSec(s => s + 1), 1000);
    } catch { alert('Microphone access denied.'); }
  };

  const stopRec = () => { clearInterval(timer.current); mrRef.current?.stop(); setRecording(false); };

  // Attach menu items including location and poll
  const ATTACH_ITEMS = [
    { key: 'doc',      label: 'Document',       icon: '📄', color: '#7c45b8', action: () => pickFile('.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.csv,.zip') },
    { key: 'img',      label: 'Photos & Videos', icon: '🖼️', color: '#0095f6', action: () => pickFile('image/*,video/*') },
    { key: 'audio',    label: 'Audio',           icon: '🎵', color: '#f97316', action: () => pickFile('audio/*') },
    { key: 'location', label: 'Location',        icon: '📍', color: '#22c55e', action: () => { setShowAttach(false); setShowLocation(true); } },
    { key: 'poll',     label: 'Poll',            icon: '📊', color: '#3b82f6', action: () => { setShowAttach(false); setShowPoll(true); } },
  ];

  return (
    <div className="mc-input-area">
      {inputDisabled && (
        <div style={{ padding:'.8rem 1rem', textAlign:'center', fontSize:'.82rem', color:'var(--muted)', background:'var(--surface-2)', borderTop:'1px solid var(--border-sub)' }}>
          🔒 Only admins can send messages in this community
        </div>
      )}
      {!inputDisabled && (<>
      {showPoll     && <PollModal     onClose={() => setShowPoll(false)}     onSend={onSend} />}
      {showLocation && <LocationModal onClose={() => setShowLocation(false)} onSend={onSend} />}

      {showEmoji && <div className="mc-emoji-picker">{EMOJIS.map(e => <button key={e} className="mc-emoji-btn" onClick={() => setText(t => t + e)}><TwEmoji emoji={e} size={22}/></button>)}</div>}
      {showAttach && (
        <div className="mc-attach-menu" ref={attachRef}>
          {ATTACH_ITEMS.map(item => (
            <button key={item.key} className="mc-attach-item" onClick={item.action}>
              <span className="mc-attach-icon" style={{ background: item.color }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
      {recording ? (
        <div className="mc-recording-row">
          <div className="mc-rec-dot"/><span className="mc-rec-timer">{fmtDur(recSec)}</span>
          <div className="mc-rec-waves">{Array.from({length:12}).map((_,i)=><div key={i} className="mc-rec-bar"/>)}</div>
          <button className="mc-send-btn" onClick={stopRec}><SendIcon/></button>
        </div>
      ) : (
        <form className="mc-input-row" onSubmit={submit}>
          <button type="button" className="mc-icon-btn" onClick={e=>{e.stopPropagation();setShowEmoji(s=>!s);setShowAttach(false);}}><EmojiIcon/></button>
          <button type="button" className="mc-icon-btn" onClick={e=>{e.stopPropagation();setShowAttach(s=>!s);setShowEmoji(false);}}><PlusIcon/></button>
          <input value={text} onChange={e=>{ setText(e.target.value); onTyping?.(); }} placeholder={placeholder||'Type your message...'} className="mc-input" autoFocus/>
          {text.trim()
            ? <button type="submit" className="mc-send-btn"><SendIcon/></button>
            : <button type="button" className="mc-send-btn mc-mic-btn" onMouseDown={startRec}><MicIcon/></button>
          }
        </form>
      )}
      </>)}
    </div>
  );
}

/* ── Message Context Menu ── */
function MsgContextMenu({ msg, mine, pos, onClose, onReply, onCopy, onDelete, onStar, onReact, onSave, onOpen }) {
  const ref = useRef();
  const REACTIONS = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Haha' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🙏', label: 'Thanks' },
  ];

  const isMedia = ['image','video','file','audio','voice'].includes(msg.type);
  const isImage = msg.type === 'image';
  const hasUrl  = !!msg.attachment?.url;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div
      ref={ref}
      className="msg-ctx-menu"
      style={{ top: pos.y, left: pos.x }}
      onClick={e => e.stopPropagation()}
    >
      {/* Emoji reactions with Twemoji */}
      <div className="msg-ctx-reactions">
        {REACTIONS.map(({ emoji, label }) => (
          <button key={emoji} className="msg-ctx-emoji" title={label} onClick={() => { onReact(emoji); onClose(); }}>
            <TwEmoji emoji={emoji} size={26} />
          </button>
        ))}
        <button className="msg-ctx-emoji msg-ctx-more-emoji" title="More">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div className="msg-ctx-divider"/>

      <button className="msg-ctx-item" onClick={() => { onReply(); onClose(); }}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
        Reply
      </button>

      {/* Copy — only for text messages */}
      {(!isMedia || msg.text) && (
        <button className="msg-ctx-item" onClick={() => { onCopy(); onClose(); }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
      )}

      {/* Open / View — for images */}
      {isImage && hasUrl && (
        <button className="msg-ctx-item" onClick={() => { onOpen?.(); onClose(); }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View photo
        </button>
      )}

      {/* Save / Download — for media */}
      {isMedia && hasUrl && (
        <button className="msg-ctx-item" onClick={() => { onSave?.(); onClose(); }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Save {msg.type === 'image' ? 'photo' : msg.type === 'video' ? 'video' : 'file'}
        </button>
      )}

      <button className="msg-ctx-item" onClick={() => { onStar(); onClose(); }}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Star
      </button>

      <button className="msg-ctx-item" onClick={() => {
        const shareText = msg.text || msg.attachment?.name || '';
        if (navigator.share && (msg.text || msg.attachment?.url)) {
          navigator.share({ text: shareText, url: msg.attachment?.url }).catch(() => {});
        } else {
          navigator.clipboard.writeText(shareText).catch(() => {});
        }
        onClose();
      }}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Forward
      </button>

      {mine && (
        <>
          <div className="msg-ctx-divider"/>
          <button className="msg-ctx-item msg-ctx-danger" onClick={() => { onDelete(); onClose(); }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete
          </button>
        </>
      )}
    </div>
  );
}

/* ── 1-on-1 Chat Panel — Production Grade ── */
function ChatPanel({ mentorship, user, socketRef }) {
  const navigate = useNavigate();
  const { newMessageEvent, msgStatusEvent, msgAckEvent, markSeen } = useSocket();

  const [messages,      setMessages]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [hasMore,       setHasMore]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [lightboxSrc,   setLightboxSrc]   = useState(null);
  const [ctxMenu,       setCtxMenu]       = useState(null);
  const [replyTo,       setReplyTo]       = useState(null);
  const [otherUser,     setOtherUser]     = useState(null); // full profile for last-seen

  const bottomRef      = useRef();
  const oldestMsgRef   = useRef(null);  // ID of oldest loaded message (for load-more cursor)
  const loadingRef     = useRef(true);  // tracks loading without stale closure
  const messagesRef    = useRef([]);    // tracks messages without stale closure in socket handlers

  const id  = mentorship._id;
  const uid = String(user?._id || user?.id || '');
  const other = String(mentorship.student?._id || mentorship.student) === uid
    ? mentorship.alumni : mentorship.student;
  const otherId = String(other?._id || '');

  // Keep messagesRef in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Safe merge utility — deduplicates and sorts chronologically ──
  // NEVER mutates input arrays
  const mergeMessages = (existing, incoming) => {
    const map = new Map();
    // Add existing first
    for (const m of existing) {
      const key = m.clientMsgId || String(m._id);
      map.set(key, m);
    }
    // Incoming overwrites (has real _id, server data)
    for (const m of incoming) {
      const key = m.clientMsgId || String(m._id);
      const existing = map.get(key);
      // Prefer server version (has real _id) over optimistic
      if (!existing || existing.status === 'pending') {
        map.set(key, m);
      }
    }
    // Sort chronologically: oldest first, newest last
    return [...map.values()].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return String(a._id) < String(b._id) ? -1 : 1;
    });
  };

  // ── Initial load — most recent 30 messages ──
  useEffect(() => {
    setLoading(true);
    loadingRef.current = true;
    setMessages([]);
    messagesRef.current = [];
    oldestMsgRef.current = null;

    api.get(`/messages/${id}?limit=30`)
      .then(r => {
        // API always returns chronological order (oldest first, newest last)
        const msgs = r.data.messages || (Array.isArray(r.data) ? r.data : []);
        setMessages(msgs);
        messagesRef.current = msgs;
        setHasMore(r.data.hasMore || false);
        // oldestMsgRef = first message in array (oldest)
        if (msgs.length > 0) oldestMsgRef.current = msgs[0]._id;
        api.post(`/messages/${id}/seen`).catch(() => {});
      })
      .catch(err => {
        console.error('[ChatPanel] Initial load failed:', err.message);
        // Do NOT corrupt state on error — keep empty array
      })
      .finally(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }, [id]);

  // ── Load older messages (infinite scroll up) ──
  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestMsgRef.current) return;
    setLoadingMore(true);
    try {
      const r = await api.get(`/messages/${id}?before=${oldestMsgRef.current}&limit=30`);
      const older = r.data.messages || (Array.isArray(r.data) ? r.data : []);
      if (older.length > 0) {
        // Prepend older messages — they are already in chronological order from API
        setMessages(prev => {
          const merged = mergeMessages(older, prev);
          return merged;
        });
        // Update oldest cursor to the first message in the older batch
        oldestMsgRef.current = older[0]._id;
        setHasMore(r.data.hasMore || false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[ChatPanel] Load more failed:', err.message);
      // Do NOT corrupt state on error
    }
    setLoadingMore(false);
  };

  // ── Fetch other user's profile for last-seen display ──
  useEffect(() => {
    if (!otherId) return;
    api.get(`/users/${otherId}`).then(r => setOtherUser(r.data)).catch(() => {});
  }, [otherId]);

  // ── Reconnect sync — fetch missed messages ──
  // Uses ref to avoid stale closure — does NOT depend on messages.length
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    const onConnect = () => {
      if (loadingRef.current) return; // still loading initial batch
      const current = messagesRef.current;
      if (current.length === 0) return;
      // Get the newest message ID (last in chronological array)
      const lastMsg = current[current.length - 1];
      const lastId = lastMsg?._id;
      if (!lastId || String(lastId).length < 10) return; // skip temp clientMsgIds
      api.get(`/messages/${id}?after=${lastId}&limit=50`)
        .then(r => {
          const missed = r.data.messages || (Array.isArray(r.data) ? r.data : []);
          if (missed.length > 0) {
            setMessages(prev => mergeMessages(prev, missed));
          }
        })
        .catch(err => {
          console.error('[ChatPanel] Reconnect sync failed:', err.message);
          // Do NOT corrupt state
        });
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
    // Only re-register when socket or id changes — NOT on messages change
  }, [id, socketRef?.current]);

  // ── Incoming messages from socket ──
  useEffect(() => {
    if (!newMessageEvent) return;
    const convId = newMessageEvent.conversationId || newMessageEvent.mentorshipId || newMessageEvent.mentorship;
    if (String(convId) !== String(id)) return;

    if (newMessageEvent.deleted) {
      setMessages(prev => prev.map(m =>
        String(m._id) === String(newMessageEvent.messageId)
          ? { ...m, text: 'This message was deleted', deletedAt: new Date() }
          : m
      ));
      return;
    }

    // Append new message — always at the end (newest last)
    setMessages(prev => {
      const exists = prev.find(m =>
        String(m._id) === String(newMessageEvent._id) ||
        (newMessageEvent.clientMsgId && m.clientMsgId === newMessageEvent.clientMsgId)
      );
      if (exists) return prev;
      return [...prev, newMessageEvent];
    });

    // Mark as seen if we're the recipient
    const senderId = String(newMessageEvent.sender?._id || newMessageEvent.sender || '');
    if (senderId !== uid) {
      api.post(`/messages/${id}/seen`).catch(() => {});
      markSeen(id, senderId, newMessageEvent._id);
    }
  }, [newMessageEvent]);

  // ── Message status updates ──
  useEffect(() => {
    if (!msgStatusEvent) return;
    if (String(msgStatusEvent.conversationId) !== String(id)) return;

    if (msgStatusEvent.type === 'reaction') {
      setMessages(prev => prev.map(m =>
        String(m._id) === String(msgStatusEvent.messageId)
          ? { ...m, reactions: msgStatusEvent.reactions }
          : m
      ));
      return;
    }

    if (msgStatusEvent.status === 'seen') {
      setMessages(prev => prev.map(m =>
        String(m.sender?._id || m.sender) === uid ? { ...m, status: 'seen' } : m
      ));
    } else if (msgStatusEvent.status === 'delivered') {
      setMessages(prev => prev.map(m =>
        String(m.sender?._id || m.sender) === uid && m.status === 'sent'
          ? { ...m, status: 'delivered' }
          : m
      ));
    }
  }, [msgStatusEvent]);

  // ── Sent ACK — replace optimistic message with server version ──
  useEffect(() => {
    if (!msgAckEvent) return;
    if (String(msgAckEvent.conversationId) !== String(id)) return;
    setMessages(prev => prev.map(m =>
      m.clientMsgId && m.clientMsgId === msgAckEvent.clientMsgId
        ? { ...m, _id: msgAckEvent.messageId, status: 'sent', createdAt: msgAckEvent.createdAt }
        : m
    ));
  }, [msgAckEvent]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Scroll to bottom instantly on initial load ──
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
  }, [loading, id]);

  // ── Send message with optimistic UI ──
  const handleSend = async (payload) => {
    const clientMsgId = `${uid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fullPayload = { ...payload, replyToId: replyTo?._id, clientMsgId };

    // Optimistic append — always at end
    const optimistic = {
      _id:            clientMsgId,
      clientMsgId,
      conversationId: id,
      sender:         user,
      text:           payload.text || '',
      type:           payload.type || 'text',
      attachment:     payload.attachment,
      replyTo:        replyTo,
      status:         'pending',
      createdAt:      new Date().toISOString(),
      reactions:      [],
    };
    setMessages(prev => [...prev, optimistic]);
    setReplyTo(null);

    try {
      await api.post(`/messages/${id}`, fullPayload);
      // ACK comes via socket msg:ack — replaces optimistic with real message
    } catch {
      setMessages(prev => prev.map(m =>
        m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m
      ));
    }
  };

  // ── Retry failed message ──
  const retryMessage = async (msg) => {
    setMessages(prev => prev.map(m =>
      m.clientMsgId === msg.clientMsgId ? { ...m, status: 'pending' } : m
    ));
    try {
      await api.post(`/messages/${id}`, {
        text: msg.text, type: msg.type, attachment: msg.attachment,
        clientMsgId: msg.clientMsgId,
      });
    } catch {
      setMessages(prev => prev.map(m =>
        m.clientMsgId === msg.clientMsgId ? { ...m, status: 'failed' } : m
      ));
    }
  };

  const handleCtx = (e, msg, mine) => {
    e.preventDefault(); e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setCtxMenu({ msg, mine, x, y });
  };

  // ── Status tick rendering — WhatsApp style ──
  const renderTick = (msg) => {
    if (!msg || String(msg.sender?._id || msg.sender) !== uid) return null;
    const s = msg.status;
    if (s === 'pending') return (
      <span className="mc-tick mc-tick-pending" title="Sending…">
        <svg viewBox="0 0 16 11" width="14" height="11" fill="none">
          <path d="M1 5.5L5.5 10L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
        </svg>
      </span>
    );
    if (s === 'failed') return (
      <span className="mc-tick mc-tick-failed" title="Failed — tap to retry">
        <svg viewBox="0 0 12 12" width="13" height="13" fill="none">
          <circle cx="6" cy="6" r="5.5" stroke="#ef4444" strokeWidth="1.3"/>
          <line x1="6" y1="3.5" x2="6" y2="6.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="6" cy="8.5" r=".8" fill="#ef4444"/>
        </svg>
      </span>
    );
    if (s === 'seen') return (
      <span className="mc-tick mc-tick-read" title="Seen">
        <svg viewBox="0 0 18 11" width="16" height="11" fill="none">
          <path d="M1 5.5L5.5 10L14.5 1" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5.5L9.5 10L18.5 1" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
    if (s === 'delivered') return (
      <span className="mc-tick mc-tick-delivered" title="Delivered">
        <svg viewBox="0 0 18 11" width="16" height="11" fill="none">
          <path d="M1 5.5L5.5 10L14.5 1" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 5.5L9.5 10L18.5 1" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
    // sent — single grey tick
    return (
      <span className="mc-tick" title="Sent">
        <svg viewBox="0 0 16 11" width="14" height="11" fill="none">
          <path d="M1 5.5L5.5 10L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  };

  const grouped = messages.reduce((acc, msg) => {
    const day = new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className="mc-chat-panel" onClick={() => ctxMenu && setCtxMenu(null)}>
      {/* Photo lightbox */}
      {lightboxSrc && (
        <div className="lb-overlay" onClick={() => setLightboxSrc(null)}>
          <button className="lb-close" onClick={() => setLightboxSrc(null)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={lightboxSrc} alt="" className="lb-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <MsgContextMenu
          msg={ctxMenu.msg}
          mine={ctxMenu.mine}
          pos={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
          onReply={() => setReplyTo(ctxMenu.msg)}
          onCopy={() => navigator.clipboard.writeText(ctxMenu.msg.text || '').catch(() => {})}
          onStar={() => {}}
          onOpen={() => ctxMenu.msg.attachment?.url && setLightboxSrc(ctxMenu.msg.attachment.url)}
          onSave={() => {
            const url = ctxMenu.msg.attachment?.url;
            const name = ctxMenu.msg.attachment?.name || 'download';
            if (url) {
              const a = document.createElement('a');
              a.href = url;
              a.download = name;
              a.click();
            }
          }}
          onReact={async (emoji) => {
            const res = await api.put(`/messages/${ctxMenu.msg._id}/react`, { emoji }).catch(() => null);
            if (res) setMessages(prev => prev.map(m => m._id === ctxMenu.msg._id ? { ...m, reactions: res.data.reactions } : m));
          }}
          onDelete={async () => {
            await api.delete(`/messages/${ctxMenu.msg._id}`).catch(() => {});
            setMessages(prev => prev.filter(m => m._id !== ctxMenu.msg._id));
          }}
        />
      )}

      {/* Header */}
      <div className="mc-chat-header">
        {/* Mobile back button */}
        <button className="mc-back-btn" onClick={() => navigate('/messages')} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div
          style={{ cursor: other?.avatar ? 'zoom-in' : 'default', flexShrink: 0 }}
          onClick={() => other?.avatar && setLightboxSrc(other.avatar)}
        >
          <Avatar user={other} size={40} fontSize=".82rem" style={{ flexShrink: 0 }}/>
        </div>
        <div className="mc-chat-header-info">
          <div className="mc-chat-header-name">{other?.firstName} {other?.lastName}</div>
          <div className="mc-chat-header-status">
            {(() => {
              const profile = otherUser || other;
              const lastSeen = profile?.updatedAt || profile?.lastSeen;
              if (!lastSeen) return <span style={{ color: 'var(--muted)', fontSize: '.65rem' }}>{profile?.role || ''}</span>;
              const diff = Date.now() - new Date(lastSeen).getTime();
              const mins = Math.floor(diff / 60000);
              const hrs  = Math.floor(diff / 3600000);
              const days = Math.floor(diff / 86400000);
              let label;
              if (mins < 5)        label = 'active recently';
              else if (mins < 60)  label = `active ${mins}m ago`;
              else if (hrs < 24)   label = `active ${hrs}h ago`;
              else if (days === 1) label = 'active yesterday';
              else                 label = `active ${days}d ago`;
              return <span style={{ color: 'var(--muted)', fontSize: '.65rem', letterSpacing: '.04em' }}>{label}</span>;
            })()}
          </div>
        </div>
        <div className="mc-chat-header-actions">
          <button className="mc-hdr-btn" onClick={() => window.__startCall?.(other?._id, other, 'audio', id)}><PhoneIcon/></button>
          <button className="mc-hdr-btn" onClick={() => window.__startCall?.(other?._id, other, 'video', id)}><VideoIcon/></button>
        </div>
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="mc-reply-bar">
          <div className="mc-reply-bar-line"/>
          <div className="mc-reply-bar-content">
            <div className="mc-reply-bar-name">Replying to {replyTo.sender?.firstName || 'message'}</div>
            <div className="mc-reply-bar-text">{replyTo.text?.slice(0, 80)}</div>
          </div>
          <button className="mc-reply-bar-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="mc-body">
        {/* Load more older messages */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '.5rem' }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ fontSize: '.75rem', color: '#a78bfa', background: 'rgba(124,69,184,.1)', border: '1px solid rgba(124,69,184,.2)', borderRadius: 20, padding: '.3rem .9rem', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}
            >
              {loadingMore ? 'Loading…' : '↑ Load older messages'}
            </button>
          </div>
        )}
        {loading ? <div className="mc-empty">Loading…</div> : messages.length === 0 ? (
          <div className="mc-empty"><div style={{fontSize:'2rem',marginBottom:'.5rem'}}>👋</div><div>No messages yet. Say hello!</div></div>
        ) : (() => {
          // Build a flat index for sequential message numbering
          const nonCallMsgs = messages.filter(m => m.type !== 'call');
          const msgIndexMap = new Map(nonCallMsgs.map((m, i) => [m._id, i + 1]));
          return Object.entries(grouped).map(([day, msgs]) => (
          <div key={day}>
            <div className="mc-day-divider"><span>{day}</span></div>
            {msgs.map((msg, i) => {
              const mine = uid === String(msg.sender?._id || msg.sender || '');
              const senderUser = mine ? user : (msg.sender?.firstName ? msg.sender : other);
              const msgNum = msgIndexMap.get(msg._id);
              return (
                <div
                  key={msg._id || i}
                  className={`mc-msg-row ${mine ? 'mine' : 'theirs'}${msg.status === 'failed' ? ' msg-failed' : ''}`}
                  onContextMenu={e => handleCtx(e, msg, mine)}
                  onClick={msg.status === 'failed' ? () => retryMessage(msg) : undefined}
                >
                  {!mine && (
                    <div
                      style={{ cursor: senderUser?.avatar ? 'zoom-in' : 'default', flexShrink: 0, alignSelf: 'flex-end' }}
                      onClick={() => senderUser?.avatar && setLightboxSrc(senderUser.avatar)}
                    >
                      <Avatar user={senderUser} size={28} fontSize=".65rem"/>
                    </div>
                  )}
                  <div className="mc-msg-col">
                    <MsgBubble msg={msg} mine={mine}/>
                    {/* Reactions display */}
                    {msg.reactions?.length > 0 && (
                      <div className={`mc-reactions${mine ? ' mine' : ''}`}>
                        {Object.entries(
                          msg.reactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <span key={emoji} className="mc-reaction-chip"
                            onClick={() => api.put(`/messages/${msg._id}/react`, { emoji }).then(r =>
                              setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, reactions: r.data.reactions } : m))
                            ).catch(() => {})}
                          >
                            <TwEmoji emoji={emoji} size={14}/>{count > 1 && <span>{count}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mc-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {mine && renderTick(msg)}
                    </div>
                  </div>
                  {mine && (
                    <div
                      style={{ cursor: user?.avatar ? 'zoom-in' : 'default', flexShrink: 0, alignSelf: 'flex-end' }}
                      onClick={() => user?.avatar && setLightboxSrc(user.avatar)}
                    >
                      <Avatar user={user} size={28} fontSize=".65rem"/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ));
        })()}
        <div ref={bottomRef}/>
      </div>

      <ChatInput onSend={handleSend} placeholder="Type your message..." replyTo={replyTo} onCancelReply={() => setReplyTo(null)}/>
    </div>
  );
}

/* ── Right panel: WhatsApp-style contact info ── */
function MentorPanel({ other, mentorship, mentorshipId }) {
  const navigate = useNavigate();
  const [muted,    setMuted]    = useState(false);
  const [starred,  setStarred]  = useState(false);
  const [clearing, setClearing] = useState(false);
  const [blocked,  setBlocked]  = useState(false);
  const [lightbox, setLightbox] = useState(null);

  if (!other || !mentorship) return null;

  const clearChat = async () => {
    if (!window.confirm('Clear all messages in this chat?')) return;
    setClearing(true);
    try {
      await api.delete(`/messages/${mentorshipId}/clear`).catch(() => {});
      window.location.reload();
    } finally { setClearing(false); }
  };

  return (
    <div className="mc-right-panel mc-contact-panel">

      {/* Photo lightbox */}
      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <button className="lb-close" onClick={() => setLightbox(null)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={lightbox} alt="" className="lb-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Avatar + name */}
      <div className="mc-cp-hero">
        <div
          className="mc-cp-avatar"
          onClick={() => other?.avatar ? setLightbox(other.avatar) : navigate(`/profile/${other._id}`)}
          style={{ cursor: 'pointer' }}
        >
          <Avatar user={other} size={88} fontSize="1.8rem" style={{ borderRadius: '50%', border: '3px solid rgba(124,69,184,.4)' }}/>
        </div>
        <div className="mc-cp-name" onClick={() => navigate(`/profile/${other._id}`)} style={{ cursor: 'pointer' }}>
          {other.firstName} {other.lastName}
        </div>
        <div className="mc-cp-sub">
          {other.designation || other.role}{other.company ? ` · ${other.company}` : ''}
        </div>
        {other.industry && <span className="mc-cp-tag">{other.industry}</span>}
      </div>

      {/* Quick action buttons */}
      <div className="mc-cp-actions">
        <button className="mc-cp-act-btn" onClick={() => window.__startCall?.(other._id, other, 'audio', mentorshipId)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <span>Voice</span>
        </button>
        <button className="mc-cp-act-btn" onClick={() => window.__startCall?.(other._id, other, 'video', mentorshipId)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>Video</span>
        </button>
        <button className="mc-cp-act-btn" onClick={() => navigate(`/profile/${other._id}`)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </button>
      </div>

      <div className="mc-cp-divider" />

      {/* About */}
      {other.bio && (
        <>
          <div className="mc-cp-section-label">About</div>
          <div className="mc-cp-about">{other.bio}</div>
          <div className="mc-cp-divider" />
        </>
      )}

      {/* Skills */}
      {other.skills?.length > 0 && (
        <>
          <div className="mc-cp-section-label">Expertise</div>
          <div className="mc-cp-tags-wrap">
            {other.skills.slice(0, 6).map(s => <span key={s} className="mc-cp-skill">{s}</span>)}
          </div>
          <div className="mc-cp-divider" />
        </>
      )}

      {/* Mentorship metrics */}
      <div className="mc-cp-section-label">Mentorship</div>
      <div className="mc-cp-row">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">{mentorship.sessions || 0} Sessions</div>
          {mentorship.matchScore > 0 && <div className="mc-cp-row-sub">{mentorship.matchScore}% match score</div>}
        </div>
      </div>

      <div className="mc-cp-divider" />

      {/* Options list */}
      <div className="mc-cp-section-label">Options</div>

      <button className={`mc-cp-row mc-cp-row-btn${starred ? ' active' : ''}`} onClick={() => setStarred(s => !s)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill={starred ? '#c9a84c' : 'none'} stroke={starred ? '#c9a84c' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">{starred ? 'Starred' : 'Starred messages'}</div>
        </div>
      </button>

      <button className={`mc-cp-row mc-cp-row-btn${muted ? ' active' : ''}`} onClick={() => setMuted(m => !m)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {muted
            ? <><path d="M18 8a6 6 0 0 0-9.33-5"/><path d="m10.68 13.31a6 6 0 0 0 7.07-7.07"/><path d="M18 8v4"/><path d="M6 8v4a6 6 0 0 0 9 5.2"/><path d="M12 19v3"/><line x1="2" y1="2" x2="22" y2="22"/></>
            : <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>
          }
        </svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">{muted ? 'Unmute notifications' : 'Mute notifications'}</div>
        </div>
      </button>

      <div className="mc-cp-divider" />

      {/* Danger actions */}
      <button className="mc-cp-row mc-cp-row-btn mc-cp-danger" onClick={clearChat} disabled={clearing}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">{clearing ? 'Clearing…' : 'Clear chat'}</div>
        </div>
      </button>

      <button className={`mc-cp-row mc-cp-row-btn mc-cp-danger${blocked ? ' mc-cp-blocked' : ''}`} onClick={() => { if (!window.confirm(blocked ? `Unblock ${other.firstName}?` : `Block ${other.firstName}?`)) return; setBlocked(b => !b); }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">{blocked ? `Unblock ${other.firstName}` : `Block ${other.firstName}`}</div>
        </div>
      </button>

      <button className="mc-cp-row mc-cp-row-btn mc-cp-danger" onClick={() => window.alert('Report submitted. Our team will review this.')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div className="mc-cp-row-text">
          <div className="mc-cp-row-title">Report {other.firstName}</div>
        </div>
      </button>

    </div>
  );
}

/* ── Group Chat Panel ── */
function GroupChatPanel({ group, user, socketRef, onLeave, onGroupUpdate }) {
  const navigate = useNavigate();
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [replyTo,   setReplyTo]   = useState(null);
  const [ctxMenu,   setCtxMenu]   = useState(null);
  const [pinned,    setPinned]    = useState([]);
  const [showPinned,setShowPinned]= useState(false);
  const [typing,    setTyping]    = useState([]); // names typing
  const [showMedia, setShowMedia] = useState(false);
  const [media,     setMedia]     = useState([]);
  const [lightbox,  setLightbox]  = useState(null);
  const [showInfo,  setShowInfo]  = useState(false);
  const bottomRef = useRef();
  const typingTimer = useRef();
  const uid = String(user?._id || user?.id || '');
  const isAdmin = group.admins?.map(a => String(a._id||a)).includes(uid);

  useEffect(() => {
    setLoading(true);
    api.get(`/groups/${group._id}/messages`).then(r => setMessages(r.data)).catch(() => {}).finally(() => setLoading(false));
    api.get(`/groups/${group._id}/pinned`).then(r => setPinned(r.data)).catch(() => {});
    const socket = socketRef?.current;
    if (socket) {
      socket.emit('join_group', group._id);

      const onGroupMsg = msg => setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
      const onReaction = ({ messageId, reactions }) =>
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
      const onDeleted = ({ messageId }) =>
        setMessages(prev => prev.filter(m => m._id !== messageId));
      const onPinned = ({ messageId, pinned: p, text }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned: p } : m));
        if (p) setPinned(prev => [{ _id: messageId, text }, ...prev.filter(x => x._id !== messageId)]);
        else   setPinned(prev => prev.filter(x => x._id !== messageId));
      };
      const onTyping = ({ name, userId: tid }) => {
        if (tid === uid) return;
        setTyping(prev => prev.includes(name) ? prev : [...prev, name]);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping([]), 3000);
      };
      const onConnect = () => {
        socket.emit('join_group', group._id);
        api.get(`/groups/${group._id}/messages`).then(r => setMessages(r.data)).catch(() => {});
      };

      socket.on('receive_group_message', onGroupMsg);
      socket.on('group_message:reaction', onReaction);
      socket.on('group_message:deleted', onDeleted);
      socket.on('group_message:pinned', onPinned);
      socket.on('group:typing', onTyping);
      socket.on('connect', onConnect);

      return () => {
        socket.off('receive_group_message', onGroupMsg);
        socket.off('group_message:reaction', onReaction);
        socket.off('group_message:deleted', onDeleted);
        socket.off('group_message:pinned', onPinned);
        socket.off('group:typing', onTyping);
        socket.off('connect', onConnect);
      };
    }
  }, [group._id, socketRef?.current]);

  useEffect(() => { 
    if (messages.length > 0) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
  }, [loading, group._id]);

  const handleSend = async (payload) => {
    const fullPayload = replyTo ? { ...payload, replyTo: replyTo._id } : payload;
    const res = await api.post(`/groups/${group._id}/messages`, fullPayload).catch(() => null);
    if (res) {
      // Server already emits receive_group_message to the room via the API route.
      // No need to re-emit from client — that causes duplicates.
      setReplyTo(null);
    }
  };

  const handleTyping = () => {
    socketRef?.current?.emit('group:typing', { groupId: group._id, name: user?.firstName, userId: uid });
  };

  const handleCtx = (e, msg, mine) => {
    e.preventDefault(); e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setCtxMenu({ msg, mine, x, y });
  };

  const handleReact = async (msgId, emoji) => {
    const res = await api.put(`/groups/${group._id}/messages/${msgId}/react`, { emoji }).catch(() => null);
    if (res) setMessages(prev => prev.map(m => m._id === msgId ? { ...m, reactions: res.data.reactions } : m));
  };

  const handleDelete = async (msgId) => {
    await api.delete(`/groups/${group._id}/messages/${msgId}`).catch(() => {});
    setMessages(prev => prev.filter(m => m._id !== msgId));
  };

  const handlePin = async (msgId) => {
    await api.put(`/groups/${group._id}/messages/${msgId}/pin`).catch(() => {});
  };

  const loadMedia = async () => {
    const r = await api.get(`/groups/${group._id}/media`).catch(() => ({ data: [] }));
    setMedia(r.data);
    setShowMedia(true);
  };

  const REACTIONS = ['👍','❤️','😂','😮','😢','🙏'];

  const grouped = messages.reduce((acc, msg) => {
    const day = new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div className="mc-chat-panel" onClick={() => ctxMenu && setCtxMenu(null)}>

      {/* Lightbox */}
      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <button className="lb-close" onClick={() => setLightbox(null)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img src={lightbox} alt="" className="lb-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div className="msg-ctx-menu" style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={e => e.stopPropagation()}>
          {/* Reactions */}
          <div className="msg-ctx-reactions">
            {REACTIONS.map(e => (
              <button key={e} className="msg-ctx-emoji" onClick={() => { handleReact(ctxMenu.msg._id, e); setCtxMenu(null); }}>
                <TwEmoji emoji={e} size={24}/>
              </button>
            ))}
          </div>
          <div className="msg-ctx-divider"/>
          <button className="msg-ctx-item" onClick={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null); }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg> Reply
          </button>
          <button className="msg-ctx-item" onClick={() => { navigator.clipboard.writeText(ctxMenu.msg.text || '').catch(()=>{}); setCtxMenu(null); }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
          </button>
          {isAdmin && (
            <button className="msg-ctx-item" onClick={() => { handlePin(ctxMenu.msg._id); setCtxMenu(null); }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>
              {ctxMenu.msg.pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          {(ctxMenu.mine || isAdmin) && (
            <>
              <div className="msg-ctx-divider"/>
              <button className="msg-ctx-item msg-ctx-danger" onClick={() => { handleDelete(ctxMenu.msg._id); setCtxMenu(null); }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mc-chat-header">
        <div className="mc-group-av-sm" style={{ cursor: 'pointer' }} onClick={() => setShowInfo(s => !s)}>
          {group.avatar || (group.type === 'community' ? '🎓' : '👥')}
        </div>
        <div className="mc-chat-header-info" style={{ cursor: 'pointer' }} onClick={() => setShowInfo(s => !s)}>
          <div className="mc-chat-header-name">{group.name}</div>
          <div className="mc-chat-header-status">
            {typing.length > 0
              ? <span style={{ color: '#4ade80' }}>{typing.join(', ')} typing…</span>
              : <><PeopleIcon/> {group.members?.length || 0} members</>
            }
          </div>
        </div>
        <div className="mc-chat-header-actions">
          <button className="mc-hdr-btn" onClick={loadMedia} title="Media">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>
          {pinned.length > 0 && (
            <button className="mc-hdr-btn" onClick={() => setShowPinned(s => !s)} title="Pinned messages" style={{ position: 'relative' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>
              <span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:'#c9a84c' }}/>
            </button>
          )}
          <button className="mc-hdr-btn mc-hdr-leave" onClick={async () => { if (!window.confirm('Leave?')) return; await api.delete(`/groups/${group._id}/leave`).catch(()=>{}); onLeave(); }} title="Leave">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {/* Pinned messages bar */}
      {showPinned && pinned.length > 0 && (
        <div style={{ background: 'rgba(201,168,76,.08)', borderBottom: '1px solid rgba(201,168,76,.2)', padding: '.6rem 1rem', maxHeight: 120, overflowY: 'auto' }}>
          <div style={{ fontSize: '.65rem', fontWeight: 700, color: '#c9a84c', letterSpacing: '.1em', marginBottom: '.4rem' }}>📌 PINNED MESSAGES</div>
          {pinned.map(p => (
            <div key={p._id} style={{ fontSize: '.82rem', color: 'var(--ink)', padding: '.2rem 0', borderBottom: '1px solid var(--border-sub)' }}>
              {p.text?.slice(0, 80)}{p.text?.length > 80 ? '…' : ''}
            </div>
          ))}
        </div>
      )}

      {/* Media gallery modal */}
      {showMedia && (
        <div className="mc-modal-overlay" onClick={() => setShowMedia(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="mc-modal-header">
              <h3>📷 Media, Links & Docs</h3>
              <button className="mc-modal-close" onClick={() => setShowMedia(false)}>✕</button>
            </div>
            {media.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No media yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {media.filter(m => m.type === 'image').map(m => (
                  <img key={m._id} src={m.attachment?.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'zoom-in', borderRadius: 4 }}
                    onClick={() => { setLightbox(m.attachment?.url); setShowMedia(false); }} />
                ))}
                {media.filter(m => m.type === 'file').map(m => (
                  <a key={m._id} href={m.attachment?.url} download={m.attachment?.name} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.5rem', background: 'var(--surface-2)', borderRadius: 6, textDecoration: 'none', color: 'var(--ink)', fontSize: '.75rem' }}>
                    📄 {m.attachment?.name?.slice(0, 20)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="mc-reply-bar">
          <div className="mc-reply-bar-line"/>
          <div className="mc-reply-bar-content">
            <div className="mc-reply-bar-name">Replying to {replyTo.sender?.firstName}</div>
            <div className="mc-reply-bar-text">{replyTo.text?.slice(0, 80)}</div>
          </div>
          <button className="mc-reply-bar-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="mc-body">
        {loading ? <div className="mc-empty">Loading…</div> : messages.length === 0 ? (
          <div className="mc-empty"><div style={{fontSize:'2.5rem',marginBottom:'.5rem'}}>{group.avatar||'👥'}</div><div>No messages yet. Start the conversation!</div></div>
        ) : Object.entries(grouped).map(([day, msgs]) => (
          <div key={day}>
            <div className="mc-day-divider"><span>{day}</span></div>
            {msgs.map((msg, i) => {
              const mine = uid === String(msg.sender?._id || msg.sender || '');
              if (msg.type === 'system') return <div key={msg._id||i} className="mc-system-msg">{msg.text}</div>;
              return (
                <div key={msg._id||i} className={`mc-msg-row ${mine?'mine':'theirs'}`} onContextMenu={e => handleCtx(e, msg, mine)}>
                  {!mine && <Avatar user={msg.sender} size={28} fontSize=".65rem" style={{ flexShrink:0, alignSelf:'flex-end' }}
                    onClick={() => msg.sender?.avatar && setLightbox(msg.sender.avatar)}/>}
                  <div className="mc-msg-col">
                    {!mine && <div className="mc-group-sender">{msg.sender?.firstName} {msg.sender?.lastName} <span className="mc-group-sender-role">{msg.sender?.role}</span></div>}
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div style={{ background: 'rgba(255,255,255,.08)', borderLeft: '3px solid #7c45b8', borderRadius: '6px 6px 0 0', padding: '.3rem .6rem', fontSize: '.75rem', color: 'var(--muted)', marginBottom: 2 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 600, fontSize: '.7rem' }}>{msg.replyTo.sender?.firstName}</div>
                        {msg.replyTo.text?.slice(0, 60)}
                      </div>
                    )}
                    {msg.pinned && <div style={{ fontSize: '.6rem', color: '#c9a84c', marginBottom: 2 }}>📌 Pinned</div>}
                    <MsgBubble msg={msg} mine={mine}/>
                    {/* Reactions */}
                    {msg.reactions?.length > 0 && (
                      <div className={`mc-reactions${mine?' mine':''}`}>
                        {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji]||0)+1; return acc; }, {})).map(([emoji, count]) => (
                          <span key={emoji} className="mc-reaction-chip" onClick={() => handleReact(msg._id, emoji)}>
                            <TwEmoji emoji={emoji} size={14}/>{count > 1 && <span>{count}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mc-time">{new Date(msg.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{mine&&<span className="mc-tick">✓</span>}</div>
                  </div>
                  {mine && <Avatar user={user} size={28} fontSize=".65rem" style={{ flexShrink:0, alignSelf:'flex-end' }}/>}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      <ChatInput
        onSend={handleSend}
        placeholder={`Message ${group.name}...`}
        disabled={group.adminOnlyMessages && !isAdmin}
        onTyping={handleTyping}
      />
    </div>
  );
}

/* ── Group Right Panel — WhatsApp style ── */
function GroupPanel({ group, user, onGroupUpdate }) {
  const navigate = useNavigate();
  const [panelTab,  setPanelTab]  = useState('community');
  const [joinReqs,  setJoinReqs]  = useState([]);
  const [media,     setMedia]     = useState([]);
  const [muted,     setMuted]     = useState(false);
  const [editName,  setEditName]  = useState(false);
  const [editDesc,  setEditDesc]  = useState(false);
  const [nameVal,   setNameVal]   = useState(group?.name || '');
  const [descVal,   setDescVal]   = useState(group?.description || '');
  const [inviteCode,setInviteCode]= useState(group?.joinCode || '');
  const [showInvite,setShowInvite]= useState(false);
  const [memberQ,   setMemberQ]   = useState('');
  const [lightbox,  setLightbox]  = useState(null);

  if (!group) return null;
  const uid = String(user?._id || user?.id || '');
  const isAdmin   = group.admins?.map(a => String(a._id||a)).includes(uid);
  const isCreator = String(group.creator?._id || group.creator) === uid;

  // Auto-load join requests and media for admins
  useEffect(() => {
    if (!isAdmin) return;
    api.get(`/groups/${group._id}/requests`).then(r => setJoinReqs(r.data)).catch(() => {});
  }, [group._id, isAdmin]);

  useEffect(() => {
    api.get(`/groups/${group._id}/media`).then(r => setMedia(r.data)).catch(() => {});
  }, [group._id]);

  const saveField = async (field, val) => {
    const res = await api.put(`/groups/${group._id}`, { [field]: val }).catch(() => null);
    if (res) onGroupUpdate?.(res.data);
  };
  const toggleAdminOnly = async () => {
    const res = await api.put(`/groups/${group._id}/settings`, { adminOnlyMessages: !group.adminOnlyMessages }).catch(() => null);
    if (res) onGroupUpdate?.(res.data);
  };
  const makeAdmin = async (mid) => {
    const res = await api.post(`/groups/${group._id}/admins/${mid}`).catch(() => null);
    if (res) onGroupUpdate?.(res.data);
  };
  const removeAdmin = async (mid) => {
    if (!window.confirm('Remove admin?')) return;
    const res = await api.delete(`/groups/${group._id}/admins/${mid}`).catch(() => null);
    if (res) onGroupUpdate?.(res.data);
  };
  const removeMember = async (mid) => {
    if (!window.confirm('Remove member?')) return;
    const res = await api.delete(`/groups/${group._id}/members/${mid}`).catch(() => null);
    if (res) onGroupUpdate?.(res.data);
  };
  const approveReq = async (mid) => {
    await api.post(`/groups/${group._id}/requests/${mid}/approve`).catch(() => {});
    setJoinReqs(p => p.filter(r => String(r._id) !== String(mid)));
    onGroupUpdate?.();
  };
  const rejectReq = async (mid) => {
    await api.delete(`/groups/${group._id}/requests/${mid}`).catch(() => {});
    setJoinReqs(p => p.filter(r => String(r._id) !== String(mid)));
  };
  const generateInvite = async () => {
    const res = await api.post(`/groups/${group._id}/generate-code`).catch(() => null);
    if (res) { setInviteCode(res.data.joinCode); setShowInvite(true); }
  };

  const members = (group.members || []).filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberQ.toLowerCase())
  );
  const inviteUrl = `${window.location.origin}/messages?join=${group._id}&code=${inviteCode}`;

  return (
    <div className="mc-right-panel gp-panel">
      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <button className="lb-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" className="lb-img" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Hero */}
      <div className="gp-hero">
        <div className="gp-avatar">{group.avatar || (group.type==='community'?'🎓':'👥')}</div>
        {editName ? (
          <div className="gp-edit-row">
            <input value={nameVal} onChange={e=>setNameVal(e.target.value)} autoFocus className="gp-edit-input"/>
            <button className="gp-save-btn" onClick={()=>{saveField('name',nameVal);setEditName(false);}}>✓</button>
            <button className="gp-cancel-btn" onClick={()=>setEditName(false)}>✕</button>
          </div>
        ) : (
          <div className="gp-name-row">
            <span className="gp-name">{group.name}</span>
            {isAdmin && <button className="gp-icon-btn" onClick={()=>setEditName(true)}>✏️</button>}
          </div>
        )}
        <div className="gp-sub">{group.type==='community'?'Community':'Group'} · {group.members?.length||0} members</div>
      </div>

      {/* Admin quick actions */}
      {isAdmin && (
        <div className="gp-actions">
          <button className="gp-act-btn" onClick={generateInvite}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Invite link</span>
          </button>
          <button className="gp-act-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            <span>Add members</span>
          </button>
        </div>
      )}

      {showInvite && inviteCode && (
        <div className="gp-invite-box">
          <div className="gp-invite-label">Invite link</div>
          <div className="gp-invite-url">{inviteUrl}</div>
          <button className="gp-copy-btn" onClick={()=>navigator.clipboard.writeText(inviteUrl).then(()=>alert('Copied!'))}>Copy link</button>
        </div>
      )}

      {/* Tabs */}
      <div className="gp-tabs">
        <button className={`gp-tab${panelTab==='community'?' active':''}`} onClick={()=>setPanelTab('community')}>Community</button>
        <button className={`gp-tab${panelTab==='announcements'?' active':''}`} onClick={()=>setPanelTab('announcements')}>Announcements</button>
      </div>

      {/* Community tab */}
      {panelTab==='community' && (
        <div className="gp-body">

          {/* Description */}
          {editDesc ? (
            <div className="gp-section">
              <textarea value={descVal} onChange={e=>setDescVal(e.target.value)} rows={3} autoFocus className="gp-edit-input" style={{resize:'vertical'}}/>
              <div style={{display:'flex',gap:'.4rem',marginTop:'.4rem'}}>
                <button className="gp-save-btn" style={{flex:1}} onClick={()=>{saveField('description',descVal);setEditDesc(false);}}>Save</button>
                <button className="gp-cancel-btn" style={{flex:1}} onClick={()=>setEditDesc(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="gp-desc-row" onClick={()=>isAdmin&&setEditDesc(true)} style={{cursor:isAdmin?'pointer':'default'}}>
              <p className="gp-desc">{group.description||(isAdmin?'Add a description…':'No description')}</p>
              {isAdmin&&<span style={{fontSize:'.75rem',color:'#7c45b8',flexShrink:0}}>✏️</span>}
            </div>
          )}

          {/* Media preview */}
          {media.length > 0 && (
            <div className="gp-section">
              <div className="gp-row-item">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Media, links and docs</span>
                <span className="gp-row-count">{media.length}</span>
              </div>
              <div className="gp-media-grid">
                {media.filter(m=>m.type==='image').slice(0,6).map(m=>(
                  <img key={m._id} src={m.attachment?.url} alt="" className="gp-media-thumb" onClick={()=>setLightbox(m.attachment?.url)}/>
                ))}
              </div>
            </div>
          )}

          {/* Admin settings */}
          {isAdmin && (
            <div className="gp-section">
              <div className="gp-section-label">Community settings</div>
              <div className="gp-setting-row">
                <div>
                  <div className="gp-setting-title">Send messages</div>
                  <div className="gp-setting-sub">{group.adminOnlyMessages?'Admins only':'All members'}</div>
                </div>
                <button className={`gp-toggle${group.adminOnlyMessages?' on':''}`} onClick={toggleAdminOnly}>
                  <span className="gp-toggle-knob"/>
                </button>
              </div>

              {joinReqs.length > 0 && (
                <>
                  <div className="gp-section-label" style={{marginTop:'.8rem'}}>
                    Join Requests
                    <span className="gp-badge-count">{joinReqs.length}</span>
                  </div>
                  {joinReqs.map(req=>(
                    <div key={req._id} className="gp-member-row">
                      <Avatar user={req} size={36} fontSize=".75rem"/>
                      <div className="gp-member-info">
                        <div className="gp-member-name">{req.firstName} {req.lastName}</div>
                        <div className="gp-member-sub">{req.role}</div>
                      </div>
                      <button className="gp-accept-btn" onClick={()=>approveReq(req._id)}>Accept</button>
                      <button className="gp-decline-btn" onClick={()=>rejectReq(req._id)}>Decline</button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Members */}
          <div className="gp-section">
            <div className="gp-section-label">{group.members?.length} member{group.members?.length!==1?'s':''}</div>
            <div className="gp-search-wrap">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={memberQ} onChange={e=>setMemberQ(e.target.value)} placeholder="Search members…" className="gp-search-input"/>
            </div>

            {members.map(m => {
              const mid = String(m._id||m);
              const isAdm = group.admins?.map(a=>String(a._id||a)).includes(mid);
              const isOwner = String(group.creator?._id||group.creator)===mid;
              const isMe = mid===uid;
              return (
                <div key={mid} className="gp-member-row" onClick={()=>navigate(`/profile/${mid}`)}>
                  <Avatar user={m} size={40} fontSize=".82rem"/>
                  <div className="gp-member-info">
                    <div className="gp-member-name">{isMe?'You':`${m.firstName} ${m.lastName}`}</div>
                    <div className="gp-member-sub">{m.designation||m.role}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.2rem'}}>
                    {isOwner && <span className="gp-badge owner">Community owner</span>}
                    {!isOwner&&isAdm && <span className="gp-badge admin">Community admin</span>}
                    {isAdmin&&!isMe&&(
                      <div style={{display:'flex',gap:'.25rem'}} onClick={e=>e.stopPropagation()}>
                        {!isAdm&&<button className="gp-mini-btn" onClick={()=>makeAdmin(mid)}>+Admin</button>}
                        {isAdm&&!isOwner&&isCreator&&<button className="gp-mini-btn danger" onClick={()=>removeAdmin(mid)}>-Admin</button>}
                        {!isOwner&&<button className="gp-mini-btn danger" onClick={()=>removeMember(mid)}>Remove</button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!isAdmin&&group.members?.length>5&&(
              <div className="gp-members-note">Only community admins can see all members</div>
            )}
          </div>

          {/* Danger */}
          <div className="gp-section">
            {isCreator ? (
              <button className="gp-danger-row" onClick={()=>{if(window.confirm('Deactivate community?'))api.delete(`/groups/${group._id}`).then(()=>window.location.reload()).catch(()=>{});}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                Deactivate community
              </button>
            ) : (
              <button className="gp-danger-row" onClick={()=>{if(window.confirm('Exit community?'))api.delete(`/groups/${group._id}/leave`).then(()=>window.location.reload()).catch(()=>{});}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Exit community
              </button>
            )}
            <button className="gp-danger-row" onClick={()=>alert('Report submitted.')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Report community
            </button>
          </div>
        </div>
      )}

      {/* Announcements tab */}
      {panelTab==='announcements' && (
        <div className="gp-body">
          <div className="gp-section">
            <div className="gp-row-item">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Media, links and docs</span>
              <span className="gp-row-count">{media.length}</span>
            </div>
          </div>
          <div className="gp-section">
            <div className="gp-setting-row">
              <div className="gp-setting-title">Mute notifications</div>
              <button className={`gp-toggle${muted?' on':''}`} onClick={()=>setMuted(m=>!m)}>
                <span className="gp-toggle-knob"/>
              </button>
            </div>
            <div className="gp-row-item" style={{marginTop:'.8rem'}}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <div>
                <div className="gp-setting-title">Encryption</div>
                <div className="gp-setting-sub">Messages are end-to-end encrypted.</div>
              </div>
            </div>
          </div>
          <div className="gp-section">
            <button className="gp-danger-row" onClick={()=>alert('Report submitted.')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Report announcements
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Create Group Modal ── */
function CreateGroupModal({ type, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [emoji, setEmoji] = useState(type==='community'?'🎓':'👥');
  const [saving, setSaving] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/groups', { name, description: desc, type, avatar: emoji });
      onCreate(res.data);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal" onClick={e => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h3>Create {type==='community'?'Community':'Group'}</h3>
          <button className="mc-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="mc-modal-emoji-row">
            {GROUP_EMOJIS.map(e => <button key={e} type="button" className={`mc-modal-emoji-btn${emoji===e?' active':''}`} onClick={()=>setEmoji(e)}>{e}</button>)}
          </div>
          <div className="mc-fg"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder={type==='community'?'e.g. MRU Alumni 2020':'e.g. Study Group'} required/></div>
          <div className="mc-fg"><label>Description <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label><textarea rows={2} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What's this about?"/></div>
          {type==='community' && <div className="mc-modal-note">🎓 Only alumni can create communities.</div>}
          <button type="submit" className="mc-modal-submit" disabled={saving||!name.trim()}>{saving?'Creating…':`Create ${type==='community'?'Community':'Group'}`}</button>
        </form>
      </div>
    </div>
  );
}

/* ── MAIN EXPORT ── */
export default function MessagesInbox() {
  const { id: activeId } = useParams();
  const { user }    = useAuth();
  const { socketRef, newMessageEvent, convUpdatedEvent } = useSocket();
  const navigate    = useNavigate();

  const [tab, setTab]           = useState('chats');
  const [convs, setConvs]       = useState([]);
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [msgRequests, setMsgRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [following, setFollowing] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  const uid = String(user?._id || user?.id || '');

  // ── Handle conv:updated events (sidebar state from server) ──
  useEffect(() => {
    if (!convUpdatedEvent) return;
    const mid = convUpdatedEvent.conversationId;
    if (!mid) return;

    // Update last message preview
    if (convUpdatedEvent.lastMessage) {
      const lm = convUpdatedEvent.lastMessage;
      const senderId = String(lm.sender?._id || lm.sender || '');
      setLastMessages(prev => ({
        ...prev,
        [mid]: {
          text:      lm.text || '',
          type:      lm.type,
          senderId,
          time:      lm.createdAt || new Date().toISOString(),
          isFromMe:  senderId === uid,
        }
      }));
    }

    // Update unread count
    if (convUpdatedEvent.unreadCount !== undefined && activeId !== mid) {
      setUnreadCounts(prev => ({ ...prev, [mid]: convUpdatedEvent.unreadCount }));
    }

    // Move conv to top
    setConvs(prev => {
      const idx = prev.findIndex(c => c._id === mid);
      if (idx < 0) {
        api.get(`/mentorship/${mid}`).then(r => {
          if (r.data?._id) {
            setConvs(p => p.find(c => c._id === r.data._id) ? p : [r.data, ...p]);
            socketRef?.current?.emit('join_group', r.data._id); // not needed but harmless
          }
        }).catch(() => {});
        return prev;
      }
      const updated = [...prev];
      const [conv] = updated.splice(idx, 1);
      return [{ ...conv, updatedAt: convUpdatedEvent.updatedAt || new Date().toISOString() }, ...updated];
    });
  }, [convUpdatedEvent]);

  // ── Also handle newMessageEvent for backward compat ──
  useEffect(() => {
    if (!newMessageEvent || newMessageEvent.isGroup) return;
    const mid = newMessageEvent.conversationId || newMessageEvent.mentorshipId || newMessageEvent.mentorship;
    if (!mid) return;
    const senderId = String(newMessageEvent.sender?._id || newMessageEvent.sender || '');
    const isFromMe = senderId === uid;
    const isActiveChat = activeId === mid;

    setLastMessages(prev => ({
      ...prev,
      [mid]: {
        text: newMessageEvent.type === 'image' ? '📷 Photo'
            : newMessageEvent.type === 'video' ? '🎥 Video'
            : newMessageEvent.type === 'voice' ? '🎤 Voice message'
            : newMessageEvent.type === 'file'  ? '📎 File'
            : (newMessageEvent.text || ''),
        type: newMessageEvent.type,
        senderId,
        time: newMessageEvent.createdAt || new Date().toISOString(),
        isFromMe,
      }
    }));

    if (!isFromMe && !isActiveChat) {
      setUnreadCounts(prev => ({ ...prev, [mid]: (prev[mid] || 0) + 1 }));
    }

    setConvs(prev => {
      const idx = prev.findIndex(c => c._id === mid);
      if (idx < 0) {
        api.get(`/mentorship/${mid}`).then(r => {
          if (r.data?._id) setConvs(p => p.find(c => c._id === r.data._id) ? p : [r.data, ...p]);
        }).catch(() => {});
        return prev;
      }
      const updated = [...prev];
      const [conv] = updated.splice(idx, 1);
      return [{ ...conv, updatedAt: new Date().toISOString() }, ...updated];
    });
  }, [newMessageEvent]);

  // When activeId changes, clear unread for that chat (server + local)
  useEffect(() => {
    if (activeId) {
      setUnreadCounts(prev => ({ ...prev, [activeId]: 0 }));
      // Tell server to reset unread count
      api.post(`/messages/${activeId}/seen`).catch(() => {});
    }
  }, [activeId]);

  useEffect(() => {
    api.get('/mentorship/my').then(r => {
      const accepted = r.data;
      accepted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setConvs(accepted);

      // Initialize lastMessages and unreadCounts from server data
      const myId = String(user?._id || user?.id || '');
      const initLast = {};
      const initUnread = {};

      accepted.forEach(m => {
        if (m.lastMessage) {
          const senderId = String(m.lastMessage.sender?._id || m.lastMessage.sender || '');
          initLast[m._id] = {
            text: m.lastMessage.type === 'image' ? '📷 Photo'
                : m.lastMessage.type === 'video' ? '🎥 Video'
                : m.lastMessage.type === 'voice' ? '🎤 Voice message'
                : m.lastMessage.type === 'file'  ? '📎 File'
                : (m.lastMessage.text || ''),
            type:      m.lastMessage.type,
            senderId,
            time:      m.lastMessage.createdAt || m.updatedAt,
            isFromMe:  senderId === myId,
          };
        }
        // Use server-side unread count
        if (m.unreadCount > 0 && m._id !== activeId) {
          initUnread[m._id] = m.unreadCount;
        }
      });

      setLastMessages(initLast);
      setUnreadCounts(initUnread);
    }).catch(() => {}).finally(() => setLoading(false));
    api.get('/message-requests/inbox').then(r => setMsgRequests(r.data)).catch(() => {});
    api.get('/users/all').then(r => setFollowing(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab==='chats') return;
    setLoading(true);
    if (tab === 'communities') {
      // Show ALL communities — both joined and not joined
      // Fetch discover (all public) and merge with joined ones
      Promise.all([
        api.get('/groups/discover?type=community'),
        api.get('/groups?type=community'),
      ]).then(([discoverRes, myRes]) => {
        // Merge: start with my communities, then add any not already in the list
        const myIds = new Set(myRes.data.map(g => g._id));
        const others = discoverRes.data.filter(g => !myIds.has(g._id));
        setGroups([...myRes.data, ...others]);
      }).catch(()=>{}).finally(()=>setLoading(false));
    } else {
      api.get('/groups?type=group').then(r=>setGroups(r.data)).catch(()=>{}).finally(()=>setLoading(false));
    }
  }, [tab]);

  const other = m => {
    const uid = String(user?._id || user?.id || '');
    if (String(m.student?._id || m.student) === uid) return m.alumni;
    return m.student;
  };

  const filteredConvs = convs.filter(m => {
    const p = other(m);
    return `${p?.firstName} ${p?.lastName}`.toLowerCase().includes(search.toLowerCase());
  });

  // All users not already in convs — for starting new chats (search required)
  const convUserIds = new Set(convs.map(m => String(other(m)?._id)));
  const filteredFollowing = search.trim()
    ? following.filter(u =>
        !convUserIds.has(String(u._id)) &&
        String(u._id) !== String(user?._id || user?.id) &&
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10)
    : [];

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const activeConv  = tab==='chats' ? convs.find(m=>m._id===activeId) : null;
  const activeGroup = tab!=='chats' ? groups.find(g=>g._id===activeId) : null;
  const activeOther = activeConv ? other(activeConv) : null;

  // If activeId is set but not in convs yet (e.g. just created), fetch it
  useEffect(() => {
    if (!activeId || tab !== 'chats') return;
    if (convs.find(m => m._id === activeId)) return; // already loaded
    api.get(`/mentorship/${activeId}`).then(r => {
      if (r.data && r.data._id) {
        setConvs(prev => prev.find(m => m._id === r.data._id) ? prev : [r.data, ...prev]);
      }
    }).catch(() => {});
  }, [activeId, convs.length]);

  const TABS = [
    { key:'chats',       label:'Chats',       icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { key:'groups',      label:'Groups',      icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key:'communities', label:'Communities', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  ];

  return (
    <DashLayout>
      <div className="mc-shell">

        {/* ── LEFT SIDEBAR ── */}
        <div className="mc-sidebar">
          {/* Brand */}
          <div className="mc-sidebar-brand">
            <div className="mc-brand-title">MRU MentorConnect</div>
            <div className="mc-brand-sub">THE DIGITAL CURATOR</div>
          </div>

          {/* Search */}
          <div className="mc-search-wrap">
            <SearchIcon/>
            <input className="mc-search" placeholder="Search conversations..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>

          {/* Tabs */}
          <div className="mc-tabs">
            {TABS.map(t => (
              <button key={t.key} className={`mc-tab${tab===t.key?' active':''}`} onClick={()=>{setTab(t.key);setSearch('');}}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="mc-list-label">{tab==='chats'?'RECENT MESSAGES':tab==='groups'?'YOUR GROUPS':'YOUR COMMUNITIES'}</div>
          <div className="mc-list">
            {loading ? <div className="mc-empty-sm">Loading…</div>
            : tab==='chats' ? (
              <>
                {filteredConvs.length === 0 && filteredFollowing.length === 0 && (
                  <div className="mc-empty-sm">{search ? 'No results' : 'No conversations yet'}</div>
                )}
                {filteredConvs.map(m => {
                  const p = other(m);
                  const last = lastMessages[m._id];
                  const unread = unreadCounts[m._id] || 0;
                  return (
                    <div key={m._id} className={`mc-conv-item${m._id===activeId?' active':''}`} onClick={()=>navigate(`/messages/${m._id}`)}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar user={p} size={46} fontSize=".82rem"/>
                      </div>
                      <div className="mc-conv-info" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="mc-conv-name" style={{ fontWeight: unread > 0 ? 700 : 500 }}>{p?.firstName} {p?.lastName}</div>
                          <div className="mc-conv-time" style={{ color: unread > 0 ? '#a78bfa' : undefined, fontWeight: unread > 0 ? 600 : 400 }}>
                            {fmtTime(last?.time || m.updatedAt || m.createdAt)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="mc-conv-sub" style={{
                            color: unread > 0 ? 'var(--ink)' : undefined,
                            fontWeight: unread > 0 ? 500 : 400,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
                          }}>
                            {last ? (last.isFromMe ? `You: ${last.text}` : last.text) : (p?.designation||p?.role)}
                          </div>
                          {unread > 0 && (
                            <span style={{
                              background: '#a78bfa', color: '#fff', borderRadius: '50%',
                              minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '.7rem', fontWeight: 700, flexShrink: 0, marginLeft: 6, padding: '0 4px'
                            }}>{unread > 99 ? '99+' : unread}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Following users — start new chat */}
                {filteredFollowing.length > 0 && (
                  <>
                    <div className="mc-list-label" style={{ marginTop: '.5rem' }}>START NEW CHAT</div>
                    {filteredFollowing.map(u => (
                      <div key={u._id} className="mc-conv-item" onClick={async () => {
                        try {
                          const res = await api.post('/mentorship/direct', { userId: u._id });
                          setConvs(prev => prev.find(c => c._id === res.data._id) ? prev : [res.data, ...prev]);
                          navigate(`/messages/${res.data._id}`);
                        } catch { navigate('/messages'); }
                      }}>
                        <Avatar user={u} size={40} fontSize=".82rem" style={{flexShrink:0}}/>
                        <div className="mc-conv-info">
                          <div className="mc-conv-name">{u.firstName} {u.lastName}</div>
                          <div className="mc-conv-sub">{u.designation||u.role}{u.company?` · ${u.company}`:''}</div>
                        </div>
                        <span style={{ fontSize: '.68rem', color: 'var(--muted)', flexShrink: 0 }}>New</span>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              filteredGroups.length===0
                ? <div className="mc-empty-sm">No {tab} yet</div>
                : filteredGroups.map(g => {
                    const uid = String(user?._id || user?.id || '');
                    const isMember = g.members?.map(m => String(m._id||m)).includes(uid);
                    const isPending = g.joinRequests?.map(r => String(r._id||r)).includes(uid);
                    return (
                      <div key={g._id} className={`mc-conv-item${g._id===activeId?' active':''}`}
                        onClick={()=>{ if(isMember) navigate(`/messages/${g._id}?type=${tab}`); }}
                        style={{ cursor: isMember ? 'pointer' : 'default' }}>
                        <div className="mc-group-av" style={{ opacity: isMember ? 1 : 0.7 }}>{g.avatar||(g.type==='community'?'🎓':'👥')}</div>
                        <div className="mc-conv-info">
                          <div className="mc-conv-name">{g.name}</div>
                          <div className="mc-conv-sub"><PeopleIcon/> {g.members?.length||0} members</div>
                        </div>
                        {!isMember && (
                          <button
                            className="mc-join-btn"
                            style={{ fontSize: '.68rem', padding: '.25rem .6rem', borderRadius: 6, border: 'none', background: isPending ? 'rgba(201,168,76,.15)' : 'rgba(124,69,184,.25)', color: isPending ? '#c9a84c' : '#a78bfa', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans,sans-serif', fontWeight: 600 }}
                            onClick={async e => {
                              e.stopPropagation();
                              if (isPending) return;
                              try {
                                const res = await api.post(`/groups/${g._id}/join`);
                                if (res.data.pending) {
                                  setGroups(prev => prev.map(x => x._id === g._id ? { ...x, joinRequests: [...(x.joinRequests||[]), { _id: uid }] } : x));
                                } else {
                                  setGroups(prev => prev.map(x => x._id === g._id ? { ...x, members: [...(x.members||[]), { _id: uid }] } : x));
                                  navigate(`/messages/${g._id}?type=${tab}`);
                                }
                              } catch(err) { alert(err.response?.data?.message || 'Failed'); }
                            }}
                          >
                            {isPending ? 'Requested' : 'Join'}
                          </button>
                        )}
                      </div>
                    );
                  })
            )}
          </div>

          {/* New Message / New Group button — hide New Community for students */}
          {!(tab === 'communities' && user?.role !== 'alumni') && (
            <button className="mc-new-msg-btn" onClick={()=>{ if(tab==='chats') navigate('/mentorship'); else setShowCreate(true); }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {tab==='chats'?'New Message':tab==='groups'?'New Group':'New Community'}
            </button>
          )}

          {/* Message Requests */}
          {msgRequests.length > 0 && (
            <button className="mc-requests-btn" onClick={() => setShowRequests(s => !s)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Message Requests
              <span className="mc-requests-count">{msgRequests.length}</span>
            </button>
          )}

          {/* Requests panel */}
          {showRequests && (
            <div className="mc-requests-panel">
              <div className="mc-requests-title">Message Requests</div>
              {msgRequests.map(req => (
                <div key={req._id} className="mc-request-item">
                  <Avatar user={req.from} size={36} fontSize=".75rem" style={{ flexShrink: 0 }}/>
                  <div className="mc-request-info">
                    <div className="mc-request-name">{req.from?.firstName} {req.from?.lastName}</div>
                    <div className="mc-request-text">{req.text?.slice(0, 50)}{req.text?.length > 50 ? '…' : ''}</div>
                  </div>
                  <div className="mc-request-btns">
                    <button className="mc-req-accept" onClick={async () => {
                      await api.post(`/message-requests/${req._id}/accept`).catch(()=>{});
                      setMsgRequests(prev => prev.filter(r => r._id !== req._id));
                    }}>✓</button>
                    <button className="mc-req-decline" onClick={async () => {
                      await api.post(`/message-requests/${req._id}/decline`).catch(()=>{});
                      setMsgRequests(prev => prev.filter(r => r._id !== req._id));
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom */}
          <div className="mc-sidebar-footer">
            <button className="mc-footer-btn" onClick={()=>navigate('/settings')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </button>
          </div>
        </div>

        {/* ── CENTER ── */}
        <div className={`mc-center${(activeConv || activeGroup) ? ' mobile-open' : ''}`}>
          {activeConv ? <ChatPanel mentorship={activeConv} user={user} socketRef={socketRef}/>
          : activeGroup ? <GroupChatPanel group={activeGroup} user={user} socketRef={socketRef}
              onLeave={()=>{ api.get(`/groups?type=${tab==='groups'?'group':'community'}`).then(r=>setGroups(r.data)).catch(()=>{}); navigate('/messages'); }}
              onGroupUpdate={updated => { if (updated) setGroups(prev => prev.map(g => g._id === updated._id ? updated : g)); }}
            />
          : (
            <div className="mc-empty-center">
              <div style={{fontSize:'3rem',marginBottom:'1rem'}}>{tab==='chats'?'💬':tab==='groups'?'👥':'🎓'}</div>
              <div className="mc-empty-title">Select a {tab==='chats'?'conversation':tab==='groups'?'group':'community'}</div>
              <div className="mc-empty-sub">Choose from the list on the left</div>
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        {activeConv && <MentorPanel other={activeOther} mentorship={activeConv} mentorshipId={activeConv._id}/>}
        {activeGroup && <GroupPanel group={activeGroup} user={user} onGroupUpdate={updated => {
          if (updated) setGroups(prev => prev.map(g => g._id === updated._id ? updated : g));
          else api.get(`/groups?type=${tab==='groups'?'group':'community'}`).then(r=>setGroups(r.data)).catch(()=>{});
        }}/>}
      </div>

      {showCreate && (
        <CreateGroupModal
          type={tab==='groups'?'group':'community'}
          onClose={()=>setShowCreate(false)}
          onCreate={g=>{ setGroups(prev=>[g,...prev]); navigate(`/messages/${g._id}?type=${tab}`); setShowCreate(false); }}
        />
      )}
    </DashLayout>
  );
}
