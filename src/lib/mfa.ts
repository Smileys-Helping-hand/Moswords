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
 * Encrypt data using AES-256-CBC
 * Uses MFA_ENCRYPTION_KEY env var (32-byte hex key)
 * Falls back to base64 in dev/test when key is missing
 */
function encryptData(data: string): string {
  const key = process.env.MFA_ENCRYPTION_KEY;

  // Fallback to base64 if key not configured (dev/test)
  if (!key) {
    console.warn('MFA_ENCRYPTION_KEY not set, using base64 fallback (insecure)');
    return `b64:${Buffer.from(data).toString('base64')}`;
  }

  try {
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(`MFA_ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${keyBuffer.length}`);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

    let encrypted = cipher.update(data, 'utf-8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV:encrypted data for decryption
    return `aes:${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt MFA data');
  }
}

/**
 * Decrypt data
 */
function decryptData(encrypted: string): string {
  // Handle base64 fallback format
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf-8');
  }

  // Handle AES format: aes:iv:ciphertext
  if (encrypted.startsWith('aes:')) {
    const key = process.env.MFA_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('MFA_ENCRYPTION_KEY not set but encrypted data found');
    }

    try {
      const parts = encrypted.slice(4).split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const keyBuffer = Buffer.from(key, 'hex');
      const iv = Buffer.from(parts[0], 'hex');
      const ciphertext = parts[1];

      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      let decrypted = decipher.update(ciphertext, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt MFA data');
    }
  }

  // Assume old base64 format without prefix
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

/**
 * Generate a 6-digit email MFA code and store it encrypted
 */
export async function generateEmailMfaCode(email: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const encryptedCode = encryptData(code);

  await db
    .update(adminUsers)
    .set({
      mfaEmailCode: encryptedCode,
      mfaEmailCodeExpiry: expiryTime,
    })
    .where(eq(adminUsers.email, email.toLowerCase()));

  return code; // Return plaintext code to send via email
}

/**
 * Verify email MFA code
 */
export async function verifyEmailMfaCode(email: string, code: string): Promise<MfaVerifyResult> {
  try {
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin[0]?.mfaEmailCode) {
      return { valid: false, message: 'No email code pending' };
    }

    // Check expiry
    const now = new Date();
    if (!admin[0].mfaEmailCodeExpiry || admin[0].mfaEmailCodeExpiry < now) {
      return { valid: false, message: 'Email code expired. Please request a new one.' };
    }

    // Decrypt and compare code
    const storedCode = decryptData(admin[0].mfaEmailCode);
    if (storedCode !== code) {
      return { valid: false, message: 'Invalid email code' };
    }

    // Clear code after successful verification
    await db
      .update(adminUsers)
      .set({
        mfaEmailCode: null,
        mfaEmailCodeExpiry: null,
      })
      .where(eq(adminUsers.email, email.toLowerCase()));

    return { valid: true, message: 'Email code verified' };
  } catch (error) {
    console.error('Error verifying email MFA code:', error);
    return { valid: false, message: 'Error verifying email code' };
  }
}

/**
 * Enable email MFA for user
 */
export async function enableEmailMfa(email: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({ mfaEmailEnabled: true })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error enabling email MFA:', error);
    throw new Error('Failed to enable email MFA');
  }
}

/**
 * Disable email MFA for user
 */
export async function disableEmailMfa(email: string): Promise<void> {
  try {
    await db
      .update(adminUsers)
      .set({
        mfaEmailEnabled: false,
        mfaEmailCode: null,
        mfaEmailCodeExpiry: null,
      })
      .where(eq(adminUsers.email, email.toLowerCase()));
  } catch (error) {
    console.error('Error disabling email MFA:', error);
    throw new Error('Failed to disable email MFA');
  }
}

/**
 * Export for testing
 */
export { encryptData, decryptData };
