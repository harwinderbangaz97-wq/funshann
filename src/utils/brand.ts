/// <reference types="vite/client" />

/**
 * Resolves the official Funshann brand logo asset.
 * When running directly on Blogger (e.g. funshann.blogspot.com), it resolves to the
 * reliable CDN / static asset URL so that brand assets load without relative path 404s.
 * Otherwise, it uses the Vite environment base URL for development and subpath deployments.
 */
const isBloggerOrigin =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('blogspot.com') ||
    window.location.hostname.includes('blogger.com'));

export const FUNSHANN_LOGO_URL = isBloggerOrigin
  ? 'https://harwinderbangaz97-wq.github.io/funshann/logo.webp'
  : `${(import.meta as any).env?.BASE_URL || './'}logo.webp`;

