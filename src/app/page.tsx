import Image from 'next/image';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Image src="/trackstar-logo.svg" alt="Trackstar Logo" width={300} height={80} />
        </div>
        <form className={styles.loginForm}>
          <input type="text" placeholder="Username" className={styles.inputField} />
          <input type="password" placeholder="Password" className={styles.inputField} />
          <button type="submit" className={styles.loginButton}>Login</button>
        </form>
      </div>
    </div>
  );
}
