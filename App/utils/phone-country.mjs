export function resolvePhoneCountry(phoneNumber) {
  const normalized = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

  if (normalized.startsWith('+32')) {
    return 'BE';
  }

  return 'CD';
}
