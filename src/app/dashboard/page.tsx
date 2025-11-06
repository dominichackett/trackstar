import Image from 'next/image';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.container}>


      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <button className={styles.newAnalysisButton}>+ New Analysis</button>
        </header>

        <div className={styles.searchContainer}>
          <input type="text" placeholder="Search for a race, driver, or track..." className={styles.searchInput} />
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent Races</h2>
          <div className={styles.cardGrid}>
            <div className={styles.raceCard}>
              <h3>Race 1 - Barber Motorsports</h3>
              <p>Date: 2025-11-05</p>
              <p>Drivers: 20</p>
            </div>
            <div className={styles.raceCard}>
              <h3>Race 2 - Barber Motorsports</h3>
              <p>Date: 2025-11-06</p>
              <p>Drivers: 22</p>
            </div>
            <div className={styles.raceCard}>
              <h3>Race 3 - Laguna Seca</h3>
              <p>Date: 2025-10-20</p>
              <p>Drivers: 18</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Favorite Drivers</h2>
          <div className={styles.cardGrid}>
            <div className={styles.driverCard}>
              <Image src="/driver-avatar.svg" alt="Driver Avatar" width={60} height={60} />
              <h4>Driver A</h4>
              <p>Team: Team X</p>
            </div>
            <div className={styles.driverCard}>
              <Image src="/driver-avatar.svg" alt="Driver Avatar" width={60} height={60} />
              <h4>Driver B</h4>
              <p>Team: Team Y</p>
            </div>
            <div className={styles.driverCard}>
              <Image src="/driver-avatar.svg" alt="Driver Avatar" width={60} height={60} />
              <h4>Driver C</h4>
              <p>Team: Team Z</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}