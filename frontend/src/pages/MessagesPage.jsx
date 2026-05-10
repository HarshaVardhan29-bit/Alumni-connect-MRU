import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import DashLayout from '../components/DashLayout';
import api from '../api/axios';

export default function MessagesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const socketRef = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mentorship, setMentorship] = useState(null);
  const bottomRef = useRef();

  // Load history + join socket room
  useEffect(() => {
    const load = async () => {
      try {
        const [msgRes, menRes] = await Promise.all([
          api.get(`/messages/${id}`),
          api.get('/mentorship/my'),
        ]);
        setMessages(msgRes.data);
        setMentorship(menRes.data.find(m => m._id === id));
      } catch (e) {
        if (e.response?.status === 403) navigate('/mentorship');
      } finally { setLoading(false); }
    };
    load();

    const socket = socketRef?.current;
    if (socket) {
      socket.emit('join_room', id);
      socket.on('receive_message', (msg) => {
        setMessages(prev => {
          // avoid duplicates (our own sent messages already added optimistically)
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      });
    }
    return () => { socket?.off('receive_message'); };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/messages/${id}`, { text });
      setMessages(m => [...m, res.data]);
      // emit to room so other party gets it instantly
      socketRef?.current?.emit('send_message', { ...res.data, mentorshipId: id });
      setText('');
    } catch (e) { alert(e.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const other = mentorship
    ? (user?.role === 'student' ? mentorship.alumni : mentorship.student)
    : null;

  return (
    <DashLayout>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '0' }}>
        {/* Header */}
        <div className="chat-header" style={{ padding: '1.2rem 2rem', borderBottom: '1px solid var(--border)', background: '#fff' }}>
          <button className="back-btn" onClick={() => navigate('/mentorship')}>← Back</button>
          {other && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', cursor: 'pointer' }}
              onClick={() => navigate(`/profile/${other._id}`)}>
              <div className="match-av" style={{ width: 38, height: 38, fontSize: '.85rem' }}>
                {`${other.firstName?.[0] || ''}${other.lastName?.[0] || ''}`.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{other.firstName} {other.lastName}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                  {other.role} · {other.industry || other.company || ''}
                  <span style={{ color: '#4ade80', marginLeft: '.5rem' }}>● Online</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="chat-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '3rem' }}>No messages yet. Say hello 👋</div>
          ) : (
            messages.map((msg, i) => {
              const uid = String(user?._id || user?.id || '');
              const senderId = String(msg.sender?._id || msg.sender || '');
              const mine = uid && uid === senderId;
              return (
                <div key={msg._id || i} className={`chat-msg ${mine ? 'mine' : 'theirs'}`}>
                  <div className="chat-bubble">{msg.text}</div>
                  <div className="chat-time">
                    {mine ? 'You' : (msg.sender?.firstName || '')} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form className="chat-input-row" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: '#fff' }} onSubmit={send}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
            disabled={sending}
          />
          <button type="submit" className="chat-send" disabled={sending || !text.trim()}>
            {sending ? '...' : '→'}
          </button>
        </form>
      </div>
    </DashLayout>
  );
}
