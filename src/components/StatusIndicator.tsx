'use client';

import styles from './StatusIndicator.module.css';

interface StatusIndicatorProps {
  loading: boolean;
  error: string | null;
  data: any[];
  loadingMessage: string;
  errorMessage: string;
  noDataMessage: string;
}

export default function StatusIndicator({
  loading,
  error,
  data,
  loadingMessage,
  errorMessage,
  noDataMessage,
}: StatusIndicatorProps) {
  if (loading) {
    return <div className={styles.loadingIndicator}>{loadingMessage}</div>;
  }

  if (error) {
    return <div className={styles.errorIndicator}>{errorMessage}</div>;
  }

  if (data.length === 0) {
    return <div className={styles.noDataIndicator}>{noDataMessage}</div>;
  }

  return null;
}
