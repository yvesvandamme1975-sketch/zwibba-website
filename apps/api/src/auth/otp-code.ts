import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_CODE_DIGITS = 6;
const OTP_CODE_MAX_EXCLUSIVE = 10 ** OTP_CODE_DIGITS;
const OTP_HASH_SALT = 'zwibba-auth-otp-v1';

export function generateOtpCode() {
  return randomInt(0, OTP_CODE_MAX_EXCLUSIVE)
    .toString()
    .padStart(OTP_CODE_DIGITS, '0');
}

export function hashOtpCode(code: string) {
  return createHash('sha256')
    .update(OTP_HASH_SALT)
    .update(':')
    .update(code)
    .digest('hex');
}

export function verifyOtpCode(code: string, hash: string) {
  const expectedHash = hashOtpCode(code);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const actualBuffer = Buffer.from(hash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
