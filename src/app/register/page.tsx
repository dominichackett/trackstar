'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { getSupabaseClient } from '@/utils/supabase/client';
import Alert from '@/components/Alert';

export default function RegisterPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const router = useRouter();
  const supabase = getSupabaseClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlertMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setAlertMessage('Passwords do not match.');
      setAlertType('error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ id: data.user.id, email: data.user.email }]);

        if (profileError) {
          throw profileError;
        }
      }

      console.log('User registered:', email);
      setAlertMessage('Registration successful! Redirecting to dashboard...');
      setAlertType('success');
      setTimeout(() => {
        setAlertMessage(null);
        router.push('/dashboard');
      }, 2000); // 2-second delay
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during registration.');
      setAlertMessage(err.message || 'An unexpected error occurred during registration.');
      setAlertType('error');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Register</h1>
      {alertMessage && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage(null)}
        />
      )}
      <form onSubmit={handleRegister} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="confirm-password">Confirm Password:</label>
          <input
            type="password"
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" disabled={loading} className={styles.button}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className={styles.loginLink}>
        Already have an account? <a href="/login">Login here</a>
      </p>
    </div>
  );
}
