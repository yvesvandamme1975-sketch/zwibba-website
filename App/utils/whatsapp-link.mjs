export function buildWhatsAppChatLink(phoneNumber, text = '') {
  const digits = typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : '';

  if (!digits) {
    return null;
  }

  const baseUrl = `https://wa.me/${digits}`;

  return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
}
