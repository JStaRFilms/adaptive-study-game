let activeUserId: string | null = null;

export function activateAccount(userId: string): void {
  if (!userId || (activeUserId !== null && activeUserId !== userId)) {
    throw new Error('Reload before changing accounts.');
  }
  activeUserId = userId;
}

export function getActiveAccountId(): string {
  if (!activeUserId) throw new Error('Sign in before accessing study data.');
  return activeUserId;
}
