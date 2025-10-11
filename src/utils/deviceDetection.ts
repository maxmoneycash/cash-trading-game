/**
 * Utility functions for device detection
 */

/**
 * Check if the current device is mobile
 * Detects both mobile browsers and PWA on mobile devices
 */
export function isMobileDevice(): boolean {
  // Check for mobile user agent
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);

  // Check for touch support (additional mobile indicator)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check for standalone mode (PWA on mobile)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;

  // Check screen size (mobile typically < 768px width)
  const isSmallScreen = window.innerWidth < 768;

  // Consider it mobile if:
  // 1. Mobile user agent, OR
  // 2. Touch device with small screen, OR
  // 3. Running as PWA
  return isMobileUA || (isTouchDevice && isSmallScreen) || isPWA;
}

/**
 * Check if running as a PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Check if passkeys/WebAuthn is supported
 */
export function isPasskeySupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    window.navigator.credentials &&
    typeof window.navigator.credentials.create === 'function'
  );
}

/**
 * Determine the best authentication method for the current device
 */
export function getRecommendedAuthMethod(): 'passkey' | 'wallet' {
  const mobile = isMobileDevice();
  const passkeySupport = isPasskeySupported();

  // On mobile with passkey support, strongly prefer passkeys
  // This avoids the wallet popup issues on mobile browsers
  if (mobile && passkeySupport) {
    return 'passkey';
  }

  // Default to wallet for desktop
  return 'wallet';
}
