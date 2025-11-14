'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/utils/supabase/client';
import styles from './page.module.css';
import Alert from '@/components/Alert';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [preferredUnits, setPreferredUnits] = useState<string>('kph');
  const [mapStyle, setMapStyle] = useState<string>('default');
  const [chartColor, setChartColor] = useState<string>('#0000ff');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || '');
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setAlert({ type: 'error', message: 'Could not fetch your profile. Please try again.' });
        } else if (profile) {
          setName(profile.name || '');
          setPreferredUnits(profile.preferred_units || 'kph');
          setMapStyle(profile.map_style || 'default');
          setChartColor(profile.chart_color || '#0000ff');
        }
      } else {
        // Redirect to login if no user is found
        router.push('/login');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [supabase, router]);

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setIsUpdatingAccount(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAlert({ type: 'error', message: 'You must be logged in to update your account.' });
      setIsUpdatingAccount(false);
      return;
    }

    const { data: updatedProfiles, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, name, email: user.email, updated_at: new Date().toISOString() })
      .select();

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else if (updatedProfiles && updatedProfiles.length > 0) {
      setName(updatedProfiles[0].name || '');
      setAlert({ type: 'success', message: 'Account details updated successfully!' });
    }
    setIsUpdatingAccount(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (newPassword !== confirmNewPassword) {
      setAlert({ type: 'error', message: 'New passwords do not match!' });
      return;
    }
    if (newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else {
      setAlert({ type: 'success', message: 'Password changed successfully!' });
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setIsUpdatingSettings(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAlert({ type: 'error', message: 'You must be logged in to update settings.' });
      setIsUpdatingSettings(false);
      return;
    }

    const { data: updatedProfiles, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        preferred_units: preferredUnits,
        map_style: mapStyle,
        chart_color: chartColor,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      setAlert({ type: 'error', message: error.message });
    } else if (updatedProfiles && updatedProfiles.length > 0) {
      setPreferredUnits(updatedProfiles[0].preferred_units || 'kph');
      setMapStyle(updatedProfiles[0].map_style || 'default');
      setChartColor(updatedProfiles[0].chart_color || '#0000ff');
      setAlert({ type: 'success', message: 'Application settings updated successfully!' });
    }
    setIsUpdatingSettings(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAlert({ type: 'error', message: `Logout failed: ${error.message}` });
    } else {
      router.push('/'); // Redirect to the home page after logout
    }
  };

  if (loading) {
    return <div className={styles.container}><p>Loading settings...</p></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Profile & Settings</h1>
      
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Details</h2>
        <form onSubmit={handleAccountUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              disabled // Email is managed by Supabase Auth and shouldn't be changed here
              className={styles.input}
            />
          </div>
                    <button type="submit" className={styles.button} disabled={isUpdatingAccount}>
                      {isUpdatingAccount ? 'Updating...' : 'Update Account'}
                    </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="new-password">New Password:</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter new password"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirm-new-password">Confirm New Password:</label>
            <input
              type="password"
              id="confirm-new-password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" className={styles.button}>Change Password</button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Application Settings</h2>
        <form onSubmit={handleSettingsUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="units">Preferred Units:</label>
            <select
              id="units"
              value={preferredUnits}
              onChange={(e) => setPreferredUnits(e.target.value)}
              className={styles.select}
            >
              <option value="kph">Kilometers per hour (kph)</option>
              <option value="mph">Miles per hour (mph)</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="map-style">Map Style:</label>
            <select
              id="map-style"
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value)}
              className={styles.select}
            >
              <option value="default">Default</option>
              <option value="dark">Dark Mode</option>
              <option value="satellite">Satellite</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="chart-color">Chart Color:</label>
            <input
              type="color"
              id="chart-color"
              value={chartColor}
              onChange={(e) => setChartColor(e.target.value)}
              className={styles.inputColor}
            />
          </div>
                    <button type="submit" className={styles.button} disabled={isUpdatingSettings}>
                      {isUpdatingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Logout</h2>
        <button onClick={handleLogout} className={`${styles.button} ${styles.logoutButton}`}>
          Logout
        </button>
      </section>
    </div>
  );
}
