import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <Image src="/trackstar-logo.svg" alt="Trackstar Logo" width={400} height={100} />
        <h1 className={styles.tagline}>Your Ultimate Race Data Companion</h1>
        <p className={styles.description}>
          Analyze your race telemetry, track driver performance, and relive every lap.
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/register" className={styles.registerButton}>
            Sign Up
          </Link>
          <Link href="/login" className={styles.loginButton}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
