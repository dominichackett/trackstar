'use client';

import styles from './page.module.css';

interface TurnData {
  turn: number;
  driverA_speed: number;
  driverB_speed: number;
  optimal_speed: number;
  commentary: string;
}

const turnByTurnAnalysis: TurnData[] = [
  {
    turn: 1,
    driverA_speed: 120,
    driverB_speed: 118,
    optimal_speed: 122,
    commentary: 'Driver A is carrying good speed, but slightly below optimal. Driver B is a bit more cautious here.',
  },
  {
    turn: 2,
    driverA_speed: 85,
    driverB_speed: 88,
    optimal_speed: 86,
    commentary: 'Driver B nails the apex and carries more speed through the corner. Driver A is a bit slow on entry.',
  },
  {
    turn: 3,
    driverA_speed: 95,
    driverB_speed: 92,
    optimal_speed: 95,
    commentary: 'Driver A matches the optimal speed perfectly. Driver B is losing a bit of time on the exit.',
  },
  {
    turn: 4,
    driverA_speed: 150,
    driverB_speed: 155,
    optimal_speed: 152,
    commentary: 'This is a fast kink, and Driver B is showing more confidence, carrying more speed through.',
  },
];

export default function TurnByTurnPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Turn-by-Turn Analysis</h1>
      <div className={styles.analysisContainer}>
        <table className={styles.analysisTable}>
          <thead>
            <tr>
              <th>Turn</th>
              <th>Driver A Speed (km/h)</th>
              <th>Driver B Speed (km/h)</th>
              <th>Optimal Speed (km/h)</th>
              <th>AI Commentary</th>
            </tr>
          </thead>
          <tbody>
            {turnByTurnAnalysis.map((turn) => (
              <tr key={turn.turn}>
                <td>{turn.turn}</td>
                <td>{turn.driverA_speed}</td>
                <td>{turn.driverB_speed}</td>
                <td>{turn.optimal_speed}</td>
                <td>{turn.commentary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
