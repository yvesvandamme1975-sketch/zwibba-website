export type MarketCountryCode = 'BE' | 'CD';

export const SUPPORTED_MARKET_COUNTRY_CODES: readonly MarketCountryCode[] = [
  'BE',
  'CD',
];

const callingCodeByCountry: Record<MarketCountryCode, string> = {
  BE: '+32',
  CD: '+243',
};

export function resolvePhoneCountry(
  phoneNumber: string,
): MarketCountryCode | null {
  const normalizedPhone = phoneNumber.trim();

  for (const countryCode of SUPPORTED_MARKET_COUNTRY_CODES) {
    if (normalizedPhone.startsWith(callingCodeByCountry[countryCode])) {
      return countryCode;
    }
  }

  return null;
}

export function normalizeMarketCountryCode(value: unknown): MarketCountryCode {
  if (value === 'BE' || value === 'CD') {
    return value;
  }

  return 'CD';
}
