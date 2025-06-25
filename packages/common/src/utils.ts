/**
 * Common utility functions
 */

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getHealthColor(
  status: string,
  lastSyncedAt: string | null,
): 'green' | 'amber' | 'red' {
  if (status !== 'active') {
    return 'red';
  }

  if (!lastSyncedAt) {
    return 'red';
  }

  const lastSyncedDate = new Date(lastSyncedAt);
  const minutesSinceSync = (Date.now() - lastSyncedDate.getTime()) / (1000 * 60);

  if (minutesSinceSync < 10) {
    return 'green';
  } else if (minutesSinceSync < 60) {
    return 'amber';
  } else {
    return 'red';
  }
} 