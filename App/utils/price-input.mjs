function normalizePriceDigits(rawValue) {
  return String(rawValue ?? '').replaceAll(/\D+/g, '');
}

export function normalizePriceCurrency(rawValue) {
  if (rawValue === 'CDF' || rawValue === 'USD' || rawValue === 'EUR') {
    return rawValue;
  }

  return '';
}

export function listingCurrenciesForCountry(countryCode) {
  return countryCode === 'BE' ? ['EUR'] : ['CDF', 'USD'];
}

function formatGroupedAmount(value) {
  return new Intl.NumberFormat('fr-FR')
    .format(value)
    .replaceAll(/\s/gu, ' ');
}

export function getCurrencyLabel(currency) {
  if (currency === 'USD') {
    return 'US$';
  }

  if (currency === 'EUR') {
    return '€';
  }

  return 'CDF';
}

export function parsePriceInput(rawValue) {
  const digits = normalizePriceDigits(rawValue);

  if (!digits) {
    return null;
  }

  const parsedValue = Number.parseInt(digits, 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

export function getPriceInputPlaceholder(currency) {
  const normalizedCurrency = normalizePriceCurrency(currency);

  return normalizedCurrency === 'USD' || normalizedCurrency === 'EUR' ? 'Ex: 350' : 'Ex: 450000';
}

export function formatPricePreview(rawValue, currency) {
  const normalizedCurrency = normalizePriceCurrency(currency);

  if (!normalizedCurrency) {
    return 'Choisissez d’abord une devise.';
  }

  const parsedValue = parsePriceInput(rawValue);

  if (parsedValue === null) {
    return `Entrez votre prix en ${getCurrencyLabel(normalizedCurrency)}.`;
  }

  if (parsedValue === 0) {
    return 'À donner';
  }

  const groupedValue = formatGroupedAmount(parsedValue);

  return `${groupedValue} ${getCurrencyLabel(normalizedCurrency)}`;
}
