import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

/**
 * Global in-app notification banner.
 * Shows a WhatsApp-style popup at the top when a new message arrives
 * and the user is NOT already on that chat page.
 */
export default function InAppNotification() {
  const { newMessageEvent } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notif, setNotif] = useState(null);
  const timerRef = useRef(null);
  const uid = String(user?._id || user?.id || '');

  useEffect(() => {
    if (!newMessageEvent) return;

    const msg = newMessageEvent;
    const senderId = String(msg.sender?._id || msg.sender || '');

    // Don't show if it's our own message
    if (senderId === uid) return;

    // Build the chat path for this message
    const mentorshipId = msg.mentorshipId || msg.mentorship;
    const groupId = msg.groupId || msg.group?._id || msg.group;
    const chatPath = msg.isGroup
      ? `/messages/${groupId}`
      : `/messages/${mentorshipId}`;

    // Don't show if already on that exact chat
    const currentPath = location.pathname;
    if (
      currentPath === chatPath ||
      currentPath.startsWith(chatPath + '?') ||
      // Also suppress if on /messages and the active chat matches
      (currentPath.includes('/messages/') && currentPath.includes(msg.isGroup ? groupId : mentorshipId))
    ) return;

    // Build notification data
    const senderName = msg.sender?.firstName
      ? `${msg.sender.firstName} ${msg.sender.lastName || ''}`.trim()
      : 'New message';

    const preview = msg.type === 'voice' ? '🎤 Voice message'
      : msg.type === 'image' ? '📷 Photo'
      : msg.type === 'video' ? '🎥 Video'
      : msg.type === 'file'  ? '📎 File'
      : msg.type === 'call'  ? '📞 Call'
      : (msg.text || '').slice(0, 60) || '...';

    const groupName = msg.isGroup ? (msg.groupName || 'Group') : null;

    setNotif({
      senderUser: msg.sender,
      senderName,
      preview,
      groupName,
      chatPath,
    });

    // Auto-dismiss after 4 seconds
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNotif(null), 4000);
  }, [newMessageEvent]);

  // Dismiss when user navigates to the chat
  useEffect(() => {
    if (notif && location.pathname.includes(notif.chatPath.split('/').pop())) {
      setNotif(null);
    }
  }, [location.pathname]);

  if (!notif) return null;

  return (
    <div
      className="in-app-notif"
      onClick={() => {
        navigate(notif.chatPath);
        setNotif(null);
      }}
    >
      <div className="in-app-notif-avatar">
        <Avatar user={notif.senderUser} size={40} fontSize=".8rem" />
      </div>
      <div className="in-app-notif-body">
        <div className="in-app-notif-title">
          {notif.groupName ? `${notif.senderName} · ${notif.groupName}` : notif.senderName}
        </div>
        <div className="in-app-notif-preview">{notif.preview}</div>
      </div>
      <button
        className="in-app-notif-close"
        onClick={e => { e.stopPropagation(); setNotif(null); }}
      >✕</button>
    </div>
  );
}
