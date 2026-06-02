/**
 * Feature-level permission system for admin controls
 * Defines available features and provides permission checking
 */

export const ADMIN_FEATURES = {
  'can_manage_api_keys': 'Create, delete, rotate API keys for ecosystem apps',
  'can_manage_users': 'Grant/revoke admin roles and manage admin users',
  'can_view_audit_logs': 'View admin action history and audit trail',
  'can_configure_subdomain': 'Access subdomain configuration and integration guide',
  'can_manage_contacts': 'Override contact sync settings and force resync',
} as const;

export type AdminFeature = keyof typeof ADMIN_FEATURES;

export const DEFAULT_FEATURES: AdminFeature[] = [
  'can_manage_api_keys',
  'can_manage_users',
  'can_view_audit_logs',
  'can_configure_subdomain',
  'can_manage_contacts',
];

/**
 * Get all available features
 */
export function getAllFeatures(): Record<AdminFeature, string> {
  return ADMIN_FEATURES;
}

/**
 * Check if feature name is valid
 */
export function isValidFeature(feature: string): feature is AdminFeature {
  return feature in ADMIN_FEATURES;
}

/**
 * Get feature description
 */
export function getFeatureDescription(feature: AdminFeature): string {
  return ADMIN_FEATURES[feature];
}

/**
 * Validate multiple features
 */
export function validateFeatures(features: string[]): AdminFeature[] {
  return features.filter((f): f is AdminFeature => isValidFeature(f));
}
