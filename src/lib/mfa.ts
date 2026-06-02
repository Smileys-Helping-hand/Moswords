/**
 * Multi-Factor Authentication (MFA) implementation using TOTP
 * Handles MFA secret generation, QR code generation, and token verification
 */

import { db } from '@/lib/db';
import { adminUsers } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Dynamic imports for speakeasy and qrcode
let speakeasy: any;
let QRCode: any;

async function initializeMfaDeps() {
  if (!speakeasy) {
    speakeasy = await import('speakeasy');
  }
  if (!QRCode) {
    QRCode = await import('qrcode');
  }
}

const APP_NAME = 'Moswords Second Brain';
const ISSUER = 'Moswords';

interface MfaSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface MfaVerifyResult {
  valid: boolean;
  message: string;
}

/**
 * Generate a new MFA secret and QR code
 */
export async function generateMfaSecret(email: string): Promise<MfaSetupData> {
  await initializeMfaDeps();

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    issuer: ISSUER,
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  return {
    secret: secret.base32,
    qrCode,
    backupCodes,
    manualEntryKey: secret.base32,
  };
}

/**
 * Verify TOTP token against secret
 */
export async function verifyMfaToken(secret: string, token: string): Promise<MfaVerifyResult> {
  await initializeMfaDeps();

  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time windows (past and future)
    });

    if (verified) {
      return { valid: true, message: 'MFA token verified' };
    } else {
      return { valid: false, message: 'Invalid MFA token' };
    }
  } catch (error) {
    return { valid: false, message: 'Error verifying MFA token' };
  }
}

/**
 * Save MFA secret and backup codes to database
 */
export async function saveMfaSecret(
  email: string,
  secret: string,
  backupCodes: string[]
): Promise<void> {
  try {
    const encryptedSecret = encryptData(secret);
    const encryptedBackupCodes = encryptData(JSON.stringify(backupCodes));

    await db
      .update(adminUsers)
      .set({
        mfaSecret: encryptedSecret,
        mfaBackupCodes: encryptedBackupCodes,
        mfaEnabled: true,
      })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error saving MFA secret:', error);
    throw new Error('Failed to save MFA secret');
  }
}

/**
 * Get MFA secret from database
 */
export async function getMfaSecret(email: string): Promise<string | null> {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin[0]?.mfaSecret) {
      return null;
    }

    return decryptData(admin[0].mfaSecret);
  } catch (error) {
    console.error('Error getting MFA secret:', error);
    return null;
  }
}

/**
 * Check if MFA is enabled for user
 */
export async function isMfaEnabled(email: string): Promise<boolean> {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    return admin[0]?.mfaEnabled ?? false;
  } catch (error) {
    console.error('Error checking MFA status:', error);
    return false;
  }
}

/**
 * Disable MFA for user
 */
export async function disableMfa(email: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
      })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error disabling MFA:', error);
    throw new Error('Failed to disable MFA');
  }
}

/**
 * Verify backup code and mark it as used
 */
export async function verifyBackupCode(email: string, code: string): Promise<boolean> {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin[0]?.mfaBackupCodes) {
      return false;
    }

    const backupCodes = JSON.parse(decryptData(admin[0].mfaBackupCodes));
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used code
    backupCodes.splice(codeIndex, 1);
    const encryptedBackupCodes = encryptData(JSON.stringify(backupCodes));

    await db
      .update(adminUsers)
      .set({ mfaBackupCodes: encryptedBackupCodes })
      .where(eq(adminUsers.email, email.toLowerCase()));

    return true;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return false;
  }
}

/**
 * Get remaining backup codes count
 */
export async function getRemainingBackupCodesCount(email: string): Promise<number> {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin[0]?.mfaBackupCodes) {
      return 0;
    }

    const backupCodes = JSON.parse(decryptData(admin[0].mfaBackupCodes));
    return backupCodes.length;
  } catch (error) {
    console.error('Error getting backup codes count:', error);
    return 0;
  }
}

/**
 * Generate random backup codes
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

/**
 * Encrypt data using NODE_ENV based approach
 * In production, use proper encryption library like crypto-js
 */
function encryptData(data: string): string {
  // Simple base64 encoding for now - in production, use proper encryption
  return Buffer.from(data).toString('base64');
}

/**
 * Decrypt data
 */
function decryptData(encrypted: string): string {
  // Simple base64 decoding for now - in production, use proper decryption
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

/**
 * Export for testing
 */
export { encryptData, decryptData };
