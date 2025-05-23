/**
 * Mobile device detection utilities
 */

/**
 * Detects if the current device is a mobile device
 * Uses both viewport width and user agent detection
 * @returns true if device is considered mobile
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || 
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Detects if the current device is a tablet
 * @returns true if device is considered a tablet
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth > 768 && window.innerWidth <= 1024
}

/**
 * Detects if the current device is a desktop
 * @returns true if device is considered desktop
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return true // default to desktop on server
  return window.innerWidth > 1024
}

/**
 * Gets the current device type as a string
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

/**
 * Check if device supports touch
 * @returns true if touch is supported
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
} 