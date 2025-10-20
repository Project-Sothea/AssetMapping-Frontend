/**
 * Offline Pack Type Definitions
 *
 * Types for Mapbox offline pack functionality.
 */

import { offlineManager } from '@rnmapbox/maps';

/**
 * Props for creating a Mapbox offline pack
 */
export type CreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];
