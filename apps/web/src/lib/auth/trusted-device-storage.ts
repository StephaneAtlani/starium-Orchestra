const PREFIX = 'starium.trustedDevice.';

export function trustedDeviceStorageKey(email: string): string {
  return `${PREFIX}${email.trim().toLowerCase()}`;
}

export function getTrustedDeviceToken(email: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(trustedDeviceStorageKey(email));
}

export function setTrustedDeviceToken(email: string, token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(trustedDeviceStorageKey(email), token);
}

export function clearTrustedDeviceToken(email: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(trustedDeviceStorageKey(email));
}
