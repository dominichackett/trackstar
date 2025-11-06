'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <Link href="/">
          <Image src="/trackstar-logo.svg" alt="Trackstar Logo" width={180} height={40} />
        </Link>
      </div>
      <div className={styles.navLinks}>
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
      </div>
      <div className={styles.userProfile}>
        <Image src="/user-profile.svg" alt="User Profile" width={40} height={40} />
      </div>
    </nav>
  );
}
