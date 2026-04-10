function normalizePriceDigits(rawValue) {
  return String(rawValue ?? '').replaceAll(/\D+/g, '');
}

export function normalizePriceCurrency(rawValue) {
  if (rawValue === 'CDF' || rawValue === 'USD') {
    return rawValue;
  }

  return '';
}

function formatGroupedAmount(value) {
  return new Intl.NumberFormat('fr-FR')
    .format(value)
    .replaceAll(/\s/gu, ' ');
}

function getCurrencyLabel(currency) {
  return currency === 'USD' ? 'US$' : 'CDF';
}

export function parsePriceInput(rawValue) {
  const digits = normalizePriceDigits(rawValue);

  if (!digits) {
    return null;
  }

  const parsedValue = Number.parseInt(digits, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function getPriceInputPlaceholder(currency) {
  return normalizePriceCurrency(currency) === 'USD' ? 'Ex: 350' : 'Ex: 450000';
}

export function formatPricePreview(rawValue, currency) {
  const normalizedCurrency = normalizePriceCurrency(currency);

  if (!normalizedCurrency) {
    return 'Choisissez d’abord une devise.';
  }

  const parsedValue = parsePriceInput(rawValue);

  if (!parsedValue) {
    return `Entrez votre prix en ${getCurrencyLabel(normalizedCurrency)}.`;
  }

  const groupedValue = formatGroupedAmount(parsedValue);

  return `${groupedValue} ${getCurrencyLabel(normalizedCurrency)}`;
}
