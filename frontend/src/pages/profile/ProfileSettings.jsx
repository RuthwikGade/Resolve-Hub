import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import api from '../../api/client';

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { addToast } = useNotifications();

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Preference fields state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('');
  const [quietHoursEnd, setQuietHoursEnd] = useState('');
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [updatingPrefs, setUpdatingPrefs] = useState(false);

  // Load initial data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }

    async function loadPreferences() {
      try {
        const res = await api.get('/auth/preferences');
        if (res.data) {
          setEmailEnabled(res.data.email_enabled);
          setPushEnabled(res.data.push_enabled);
          setInAppEnabled(res.data.in_app_enabled);
          setQuietHoursStart(res.data.quiet_hours_start || '');
          setQuietHoursEnd(res.data.quiet_hours_end || '');
        }
      } catch (err) {
        addToast(err.message || 'Failed to load notification preferences', 'error');
      } finally {
        setLoadingPrefs(false);
      }
    }

    loadPreferences();
  }, [user, addToast]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name is required.', 'warning');
      return;
    }

    setUpdatingProfile(true);
    try {
      const payload = { name, phone };
      if (password) {
        if (password.length < 6) {
          addToast('Password must be at least 6 characters.', 'warning');
          setUpdatingProfile(false);
          return;
        }
        payload.password = password;
      }

      const res = await api.put('/auth/profile', payload);
      // Update global context user object
      updateUser(res.data);
      addToast('Profile updated successfully!', 'success');
      setPassword('');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setUpdatingPrefs(true);
    try {
      const payload = {
        email_enabled: emailEnabled,
        push_enabled: pushEnabled,
        in_app_enabled: inAppEnabled,
        quiet_hours_start: quietHoursStart || null,
        quiet_hours_end: quietHoursEnd || null,
      };

      const res = await api.put('/auth/preferences', payload);
      addToast('Notification preferences updated!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setUpdatingPrefs(false);
    }
  };

  return (
    <div className="profile-settings-page page-transition" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Account & Profile Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal details and system notifications.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Profile Details Form */}
        <Card noHover header="Personal Profile Details">
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">Email Address (Read-only)</label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={email}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">Phone Number</label>
                <input
                  id="profile-phone"
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-password">Update Password (Leave blank to keep current)</label>
              <input
                id="profile-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                autoComplete="new-password"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <Button type="submit" loading={updatingProfile}>
                Save Profile Details
              </Button>
            </div>
          </form>
        </Card>

        {/* Notification Preferences Form */}
        <Card noHover header="Notification Channels & Preferences">
          {loadingPrefs ? (
            <Loader variant="grid" count={1} />
          ) : (
            <form onSubmit={handlePreferencesSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {/* Email toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Email Notifications</span>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>Receive email alerts when a complaint is assigned, escalated, or resolved.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>

                {/* In-App toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>In-App Notifications</span>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>Receive alerts in your app dashboard notifications bell.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inAppEnabled}
                    onChange={(e) => setInAppEnabled(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>

                {/* Push Notifications toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Web Push Notifications</span>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>Enable browser push notifications to see real-time updates.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={(e) => setPushEnabled(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Quiet Hours */}
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>🔇 Quiet Hours (Do Not Disturb)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>Temporarily silence push and email notifications during specified hours of the day.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="quiet-start">Start Time</label>
                  <input
                    id="quiet-start"
                    type="time"
                    className="form-input"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="quiet-end">End Time</label>
                  <input
                    id="quiet-end"
                    type="time"
                    className="form-input"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                <Button type="submit" loading={updatingPrefs}>
                  Save Preferences
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
