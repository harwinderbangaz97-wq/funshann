/// <reference types="vite/client" />

/**
 * Resolves the official Funshann brand logo asset using the Vite environment base path.
 * This guarantees proper asset resolution on root domains, custom subpaths (e.g. GitHub Pages /funshann/),
 * and standalone offline distributions without issuing absolute /logo.png 404 requests.
 */
export const FUNSHANN_LOGO_URL = `${(import.meta as any).env?.BASE_URL || './'}logo.png`;

