import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashLayout from '../components/DashLayout';
import api from '../api/axios';
import '../styles/settings.css';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [subSection, setSubSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for various settings
  const [accountInfo, setAccountInfo] = useState({
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || user?.email?.split('@')[0] || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    isPrivate: user?.isPrivate || false,
    allowTagging: true,
    showActivity: true,
    allowMessages: true,
    showOnlineStatus: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    mentions: true,
    messages: true,
    follows: true,
    likes: true,
    comments: true
  });
  
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [downloadRequested, setDownloadRequested] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };
  
  // Main sections
  const sections = [
    {
      id: 'account',
      title: 'Your account',
      description: 'See information about your account, download an archive of your data, or learn about your account deactivation options',
      icon: '👤',
      subsections: [
        { id: 'info', title: 'Account information', description: 'See your account information like your phone number and email address.' },
        { id: 'password', title: 'Change your password', description: 'Change your password at any time.' },
        { id: 'download', title: 'Download an archive of your data', description: 'Get insights into the type of information stored for your account.' },
        { id: 'deactivate', title: 'Deactivate your account', description: 'Find out how you can deactivate your account.' }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy and safety',
      description: 'Manage what information you see and share',
      icon: '🔒',
      subsections: [
        { id: 'activity', title: 'Audience, media and tagging', description: 'Manage what information you allow other people to see.' },
        { id: 'posts', title: 'Your posts', description: 'Manage the information associated with your posts.' },
        { id: 'content', title: 'Content you see', description: 'Decide what you see based on your preferences like interests.' },
        { id: 'mute', title: 'Mute and block', description: 'Manage the accounts, words, and notifications that you\'ve muted or blocked.' },
        { id: 'messages', title: 'Direct messages', description: 'Manage who can message you directly.' },
        { id: 'spaces', title: 'Spaces', description: 'Manage who can see your Spaces listening activity.' },
        { id: 'discoverability', title: 'Discoverability and contacts', description: 'Control your discoverability settings and manage contacts you\'ve imported.' },
        { id: 'location', title: 'Location information', description: 'Manage the location information MRU receives from your devices.' }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Select the kinds of notifications you get about your activities and recommendations',
      icon: '🔔',
      subsections: [
        { id: 'preferences', title: 'Preferences', description: 'Select your preferences by notification type.' },
        { id: 'push', title: 'Push notifications', description: 'Manage push notifications on your devices.' },
        { id: 'email', title: 'Email notifications', description: 'Control when and how often MRU sends you emails.' }
      ]
    },
    {
      id: 'accessibility',
      title: 'Accessibility, display, and languages',
      description: 'Manage how content is displayed to you',
      icon: '♿',
      subsections: [
        { id: 'display', title: 'Display', description: 'Manage your font size, color, and background.' },
        { id: 'languages', title: 'Languages', description: 'Manage which languages are used to personalize your experience.' }
      ]
    },
    {
      id: 'resources',
      title: 'Additional resources',
      description: 'Check out other resources and settings',
      icon: '📚',
      subsections: [
        { id: 'help', title: 'Help Center', description: 'Get help using MRU Alumni Network.' },
        { id: 'terms', title: 'Terms of Service', description: 'Review the Terms of Service.' },
        { id: 'privacy-policy', title: 'Privacy Policy', description: 'Review the Privacy Policy.' }
      ]
    }
  ];
  
  const handleSaveAccountInfo = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', accountInfo);
      showMessage('Account information updated successfully');
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to update account information', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    if (passwordData.new.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await api.put('/users/profile', { password: passwordData.new });
      showMessage('Password changed successfully. Please log in again.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDownloadData = async () => {
    setDownloadRequested(true);
    showMessage('Your data archive request has been received. You will receive an email when it\'s ready.');
  };
  
  const handleDeactivateAccount = async () => {
    if (deactivateConfirm.toLowerCase() !== 'deactivate') {
      showMessage('Please type "deactivate" to confirm', 'error');
      return;
    }
    
    if (!window.confirm('Are you sure you want to deactivate your account? This action can be reversed within 30 days.')) {
      return;
    }
    
    try {
      await api.post('/users/deactivate');
      showMessage('Account deactivated successfully');
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to deactivate account', 'error');
    }
  };
  
  const handlePrivacyToggle = async (setting) => {
    const newValue = !privacySettings[setting];
    setPrivacySettings(prev => ({ ...prev, [setting]: newValue }));
    
    try {
      await api.put('/users/privacy-settings', { [setting]: newValue });
      showMessage('Privacy setting updated');
    } catch (error) {
      setPrivacySettings(prev => ({ ...prev, [setting]: !newValue }));
      showMessage('Failed to update setting', 'error');
    }
  };
  
  const handleNotificationToggle = async (setting) => {
    const newValue = !notificationSettings[setting];
    setNotificationSettings(prev => ({ ...prev, [setting]: newValue }));
    
    try {
      await api.put('/users/notification-settings', { [setting]: newValue });
      showMessage('Notification setting updated');
    } catch (error) {
      setNotificationSettings(prev => ({ ...prev, [setting]: !newValue }));
      showMessage('Failed to update setting', 'error');
    }
  };
  
  const renderMainMenu = () => (
    <div className="settings-main-menu">
      <div className="settings-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search Settings"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {sections.map(section => (
        <button
          key={section.id}
          className="settings-menu-item"
          onClick={() => {
            setActiveSection(section.id);
            setSubSection(null);
          }}
        >
          <div className="settings-menu-icon">{section.icon}</div>
          <div className="settings-menu-content">
            <div className="settings-menu-title">{section.title}</div>
            <div className="settings-menu-desc">{section.description}</div>
          </div>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      ))}

      {/* Logout button at the bottom */}
      <div className="settings-logout-wrap">
        <button
          className="settings-logout-btn"
          onClick={() => { logout(); navigate('/'); }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
        {user && (
          <div className="settings-logout-user">
            @{user.username || user.email?.split('@')[0]}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderSubMenu = () => {
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;
    
    return (
      <div className="settings-submenu">
        <button className="settings-back-btn" onClick={() => setActiveSection(null)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Settings
        </button>
        
        <h2 className="settings-section-header">{section.title}</h2>
        <p className="settings-section-desc">{section.description}</p>
        
        {section.subsections.map(sub => (
          <button
            key={sub.id}
            className="settings-menu-item"
            onClick={() => setSubSection(sub.id)}
          >
            <div className="settings-menu-content">
              <div className="settings-menu-title">{sub.title}</div>
              <div className="settings-menu-desc">{sub.description}</div>
            </div>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>
    );
  };
  
  const renderContent = () => {
    if (!activeSection || !subSection) return null;
    
    const section = sections.find(s => s.id === activeSection);
    const sub = section?.subsections.find(s => s.id === subSection);
    
    if (!sub) return null;
    
    return (
      <div className="settings-content">
        <button className="settings-back-btn" onClick={() => setSubSection(null)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {section.title}
        </button>
        
        <h2 className="settings-content-header">{sub.title}</h2>
        <p className="settings-content-desc">{sub.description}</p>
        
        {message.text && (
          <div className={`settings-message settings-message-${message.type}`}>
            {message.text}
          </div>
        )}
        
        {/* Account Information */}
        {activeSection === 'account' && subSection === 'info' && (
          <div className="settings-form">
            <div className="settings-field">
              <label>Email address</label>
              <input
                type="email"
                value={accountInfo.email}
                onChange={(e) => setAccountInfo(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label>Phone number</label>
              <input
                type="tel"
                value={accountInfo.phone}
                onChange={(e) => setAccountInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Add phone number"
              />
            </div>
            <div className="settings-field">
              <label>Username</label>
              <input
                type="text"
                value={accountInfo.username}
                onChange={(e) => setAccountInfo(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <button
              className="settings-save-btn"
              onClick={handleSaveAccountInfo}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
        
        {/* Change Password */}
        {activeSection === 'account' && subSection === 'password' && (
          <form className="settings-form" onSubmit={handleChangePassword}>
            <div className="settings-field">
              <label>Current password</label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="settings-field">
              <label>New password</label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="settings-field">
              <label>Confirm password</label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              className="settings-save-btn"
              disabled={saving}
            >
              {saving ? 'Changing...' : 'Change password'}
            </button>
          </form>
        )}
        
        {/* Download Data */}
        {activeSection === 'account' && subSection === 'download' && (
          <div className="settings-form">
            <div className="settings-info-box">
              <p>You can request a download of your account information, including:</p>
              <ul>
                <li>Your profile information</li>
                <li>Your posts and comments</li>
                <li>Your connections and followers</li>
                <li>Your messages</li>
                <li>Your activity history</li>
              </ul>
              <p>We'll email you a link to download your archive when it's ready (usually within 24 hours).</p>
            </div>
            <button
              className="settings-save-btn"
              onClick={handleDownloadData}
              disabled={downloadRequested}
            >
              {downloadRequested ? 'Request sent' : 'Request archive'}
            </button>
          </div>
        )}
        
        {/* Deactivate Account */}
        {activeSection === 'account' && subSection === 'deactivate' && (
          <div className="settings-form">
            <div className="settings-danger-box">
              <h3>⚠️ Deactivate your account</h3>
              <p>This will deactivate your account. You can restore it by logging in within 30 days.</p>
              <p>When your account is deactivated:</p>
              <ul>
                <li>Your profile won't be visible to others</li>
                <li>Your posts will be hidden</li>
                <li>You won't receive notifications</li>
                <li>You can reactivate by logging in within 30 days</li>
              </ul>
            </div>
            <div className="settings-field">
              <label>Type "deactivate" to confirm</label>
              <input
                type="text"
                value={deactivateConfirm}
                onChange={(e) => setDeactivateConfirm(e.target.value)}
                placeholder="deactivate"
              />
            </div>
            <button
              className="settings-danger-btn"
              onClick={handleDeactivateAccount}
              disabled={deactivateConfirm.toLowerCase() !== 'deactivate'}
            >
              Deactivate account
            </button>
          </div>
        )}
        
        {/* Privacy Settings */}
        {activeSection === 'privacy' && subSection === 'activity' && (
          <div className="settings-form">
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Private account</div>
                <div className="settings-toggle-desc">When your account is private, only people you approve can see your posts</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handlePrivacyToggle('isPrivate')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
            
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Allow tagging</div>
                <div className="settings-toggle-desc">Allow others to tag you in their posts</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handlePrivacyToggle('allowTagging')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
            
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Show activity status</div>
                <div className="settings-toggle-desc">Let others see when you're active</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handlePrivacyToggle('showActivity')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
          </div>
        )}
        
        {/* Direct Messages */}
        {activeSection === 'privacy' && subSection === 'messages' && (
          <div className="settings-form">
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Allow message requests</div>
                <div className="settings-toggle-desc">Allow people you don't follow to send you message requests</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handlePrivacyToggle('allowMessages')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
            
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Show online status</div>
                <div className="settings-toggle-desc">Show when you're online in messages</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handlePrivacyToggle('showOnlineStatus')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
          </div>
        )}
        
        {/* Notifications */}
        {activeSection === 'notifications' && subSection === 'preferences' && (
          <div className="settings-form">
            <h3 className="settings-subsection-title">Email notifications</h3>
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Email notifications</div>
                <div className="settings-toggle-desc">Receive email notifications about your activity</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handleNotificationToggle('email')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
            
            <h3 className="settings-subsection-title">Push notifications</h3>
            <div className="settings-toggle-item">
              <div>
                <div className="settings-toggle-title">Push notifications</div>
                <div className="settings-toggle-desc">Receive push notifications on your devices</div>
              </div>
              <button
                className={settings-toggle }
                onClick={() => handleNotificationToggle('push')}
              >
                <span className="settings-toggle-slider"></span>
              </button>
            </div>
            
            <h3 className="settings-subsection-title">Activity notifications</h3>
            {['mentions', 'messages', 'follows', 'likes', 'comments'].map(type => (
              <div key={type} className="settings-toggle-item">
                <div>
                  <div className="settings-toggle-title">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
                  <div className="settings-toggle-desc">Get notified when someone {type} you</div>
                </div>
                <button
                  className={settings-toggle }
                  onClick={() => handleNotificationToggle(type)}
                >
                  <span className="settings-toggle-slider"></span>
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Display Settings */}
        {activeSection === 'accessibility' && subSection === 'display' && (
          <div className="settings-form">
            <div className="settings-info-box">
              <p>Customize how content is displayed. These settings affect all accounts on this browser.</p>
            </div>
            
            <h3 className="settings-subsection-title">Font size</h3>
            <div className="settings-radio-group">
              {['Small', 'Default', 'Large'].map(size => (
                <label key={size} className="settings-radio-item">
                  <input
                    type="radio"
                    name="fontSize"
                    checked={localStorage.getItem('fontSize') === size || (size === 'Default' && !localStorage.getItem('fontSize'))}
                    onChange={() => {
                      localStorage.setItem('fontSize', size);
                      document.documentElement.style.fontSize = size === 'Small' ? '14px' : size === 'Large' ? '17px' : '';
                      showMessage('Font size updated');
                    }}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
            
            <h3 className="settings-subsection-title">Theme</h3>
            <div className="settings-radio-group">
              {['Light', 'Dark', 'Warm'].map(theme => (
                <label key={theme} className="settings-radio-item">
                  <input
                    type="radio"
                    name="theme"
                    checked={localStorage.getItem('theme') === theme.toLowerCase() || (theme === 'Light' && !localStorage.getItem('theme'))}
                    onChange={() => {
                      const themeValue = theme.toLowerCase();
                      localStorage.setItem('theme', themeValue);
                      document.documentElement.setAttribute('data-theme', themeValue);
                      showMessage('Theme updated');
                    }}
                  />
                  <span>{theme}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Help Center */}
        {activeSection === 'resources' && subSection === 'help' && (
          <div className="settings-form">
            <div className="settings-info-box">
              <h3>Need help?</h3>
              <p>Visit our Help Center for answers to common questions and troubleshooting guides.</p>
              <button className="settings-link-btn" onClick={() => window.open('/help', '_blank')}>
                Visit Help Center →
              </button>
            </div>
          </div>
        )}
        
        {/* Terms of Service */}
        {activeSection === 'resources' && subSection === 'terms' && (
          <div className="settings-form">
            <div className="settings-info-box">
              <h3>Terms of Service</h3>
              <p>Review our Terms of Service to understand your rights and responsibilities.</p>
              <button className="settings-link-btn" onClick={() => window.open('/terms', '_blank')}>
                Read Terms of Service →
              </button>
            </div>
          </div>
        )}
        
        {/* Privacy Policy */}
        {activeSection === 'resources' && subSection === 'privacy-policy' && (
          <div className="settings-form">
            <div className="settings-info-box">
              <h3>Privacy Policy</h3>
              <p>Learn how we collect, use, and protect your personal information.</p>
              <button className="settings-link-btn" onClick={() => window.open('/privacy', '_blank')}>
                Read Privacy Policy →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <DashLayout>
      <div className="settings-container">
        <div className="settings-layout">
          {/* Main menu — always rendered, hidden on mobile when a section is active */}
          <div className={`settings-main-menu${activeSection ? ' mobile-hidden' : ''}`} style={activeSection ? { display: 'none' } : {}}>
            {renderMainMenu()}
          </div>
          {/* Submenu — slides in on mobile */}
          {activeSection && !subSection && (
            <div className="settings-submenu mobile-open">
              {renderSubMenu()}
            </div>
          )}
          {/* Content — slides in on mobile */}
          {activeSection && subSection && (
            <div className="settings-content mobile-open">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </DashLayout>
  );
}
