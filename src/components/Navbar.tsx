'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import { getSupabaseClient } from '@/utils/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      if (_event === 'SIGNED_OUT' && !session) {
        console.log('User signed out, redirecting to /...');
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    console.log('Attempting to log out...');
    console.log('Session before signOut:', session);
    const { error } = await supabase.auth.signOut();
    console.log('Error from signOut:', error);
    if (!error) {
      console.log('Sign out successful (no error reported).');
      setSession(null); // Optimistically set local state to null
      console.log('Session state after setSession(null):', session);
    } else {
      console.error('Error during signOut:', error);
    }
    console.log('Session after signOut attempt (final check):', session);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href="/">
          <Image src="/trackstar-logo.svg" alt="Trackstar Logo" width={180} height={40} />
        </Link>
      </div>
      <div className={styles.navLinks}>
        {session && (
          <>
            <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}>
              Dashboard
            </Link>
            <Link href="/races" className={`${styles.navLink} ${pathname === '/races' ? styles.active : ''}`}>
              Races
            </Link>
            <Link href="/races/results" className={`${styles.navLink} ${pathname === '/races/results' ? styles.active : ''}`}>
              Race Results
            </Link>
            <Link href="/analysis" className={`${styles.navLink} ${pathname === '/analysis' ? styles.active : ''}`}>
              Analysis
            </Link>
            <Link href="/ai-chat" className={`${styles.navLink} ${pathname === '/ai-chat' ? styles.active : ''}`}>
              AI Chat
            </Link>
            <Link href="/settings" className={`${styles.navLink} ${pathname === '/settings' ? styles.active : ''}`}>
              Settings
            </Link>
          </>
        )}
      </div>
      <div className={styles.userProfile}>
        {session && (
          <button onClick={handleLogout} className={styles.navLink}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
