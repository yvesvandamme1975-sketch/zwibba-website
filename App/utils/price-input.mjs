function normalizePriceDigits(rawValue) {
  return String(rawValue ?? '').replaceAll(/\D+/g, '');
}

export function parsePriceInput(rawValue) {
  const digits = normalizePriceDigits(rawValue);

  if (!digits) {
    return null;
  }

  const parsedValue = Number.parseInt(digits, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function formatPricePreview(rawValue) {
  const parsedValue = parsePriceInput(rawValue);

  if (!parsedValue) {
    return 'Entrez votre prix en CDF.';
  }

  const groupedValue = new Intl.NumberFormat('fr-FR')
    .format(parsedValue)
    .replaceAll(/\s/gu, ' ');

  return `${groupedValue} CDF`;
}
