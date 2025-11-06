'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState<string>('John Doe');
  const [email, setEmail] = useState<string>('john.doe@example.com');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [preferredUnits, setPreferredUnits] = useState<string>('kph');
  const [mapStyle, setMapStyle] = useState<string>('default');
  const [chartColor, setChartColor] = useState<string>('blue');

  const handleAccountUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Account details updated:', { name, email });
    alert('Account details updated!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match!');
      return;
    }
    console.log('Password changed:', { currentPassword, newPassword });
    alert('Password changed!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleSettingsUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Application settings updated:', { preferredUnits, mapStyle, chartColor });
    alert('Application settings updated!');
  };

  const handleLogout = () => {
    // In a real application, you would clear authentication tokens/sessions here.
    console.log('User logged out.');
    router.push('/'); // Redirect to the home page or login page after logout
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>User Profile & Settings</h1>

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
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>Update Account</button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="current-password">Current Password:</label>
            <input
              type="password"
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="new-password">New Password:</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
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
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>Save Settings</button>
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
