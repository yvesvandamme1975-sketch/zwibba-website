/**
 * Curated FR + NL knowledge base for the Zwibba WhatsApp support agent.
 *
 * Facts here are sourced from the real product configuration, not invented:
 * - Market/currency/language facts: src/site/locales/fr-cd.mjs, fr-be.mjs, nl-be.mjs
 * - Boost price/duration: apps/api/src/boost/boost.service.ts (activateBoost)
 * - Safety tips: src/site/locales/fr-cd.mjs (ui.safetyTips)
 *
 * This module has no side effects and returns a deterministic string so it
 * can be embedded verbatim in the agent's system prompt.
 */
export const knowledgeBase = `
### Comment vendre sur Zwibba / Hoe verkopen op Zwibba

FR — Dans l'application Zwibba : prenez 1 à 5 photos de l'article, l'IA
propose automatiquement un titre, une catégorie, une description et un prix
conseillé. Ajustez si besoin, confirmez le lieu (quartier) puis publiez.
L'annonce peut ensuite être partagée sur WhatsApp en quelques secondes.
Publier une annonce est gratuit.

NL — In de Zwibba-app: neem 1 tot 5 foto's van het artikel, de AI stelt
automatisch een titel, categorie, beschrijving en aanbevolen prijs voor. Pas
indien nodig aan, bevestig de locatie (wijk) en publiceer. De advertentie kan
daarna in enkele seconden via WhatsApp gedeeld worden. Een advertentie
plaatsen is gratis.

### Frais / Kosten

FR — La publication d'une annonce est gratuite. La seule option payante est
le "Boost" (mise en avant), qui est optionnel.

NL — Een advertentie plaatsen is gratis. De enige betalende optie is de
"Boost" (extra zichtbaarheid), en die is optioneel.

### Boost

FR — Le Boost met une annonce en avant ("Top Ad") pendant 24 heures pour un
prix de 15 000 CDF (marché RDC). Le paiement se fait depuis le portefeuille
Zwibba dans l'application (M-Pesa, Airtel Money, Orange Money pour
l'alimenter). Le Boost est réversible et n'affecte jamais le compte d'un
autre vendeur.

NL — De Boost zet een advertentie 24 uur lang bovenaan ("Top Ad"). In de
DR Congo-markt kost dit 15 000 CDF, betaald vanuit de Zwibba-portemonnee in
de app (opgeladen via M-Pesa, Airtel Money of Orange Money).

### Sécurité / Veiligheid

FR — Conseils de sécurité Zwibba : évitez de payer à l'avance, même pour la
livraison ; rencontrez le vendeur dans un lieu public sûr ; inspectez
l'article avant de payer ; assurez-vous que l'article emballé est bien celui
vérifié ; ne payez que si vous êtes satisfait. Le numéro de téléphone est
vérifié par OTP à l'inscription. Les échanges et le contact se font dans
l'application, jamais via un tiers non authentifié.

NL — Veiligheidstips van Zwibba: betaal nooit op voorhand, ook niet voor
levering; ontmoet de verkoper op een veilige, openbare plek; controleer het
artikel voor je betaalt; zorg dat het verpakte artikel wel degelijk het
gecontroleerde artikel is; betaal enkel als je tevreden bent. Het
telefoonnummer wordt bij registratie geverifieerd via een OTP-code.

### Marchés / Markten

FR — Zwibba est présent en République Démocratique du Congo (RDC), avec le
lancement centré sur Lubumbashi (prix affichés en CDF, indicatif +243), et en
Belgique (prix affichés en EUR, indicatif +32). Le marché RDC est identifié
en interne par le code "CD", le marché belge par le code "BE".

NL — Zwibba is actief in de Democratische Republiek Congo (DRC), met de
lancering gericht op Lubumbashi (prijzen in CDF, landcode +243), en in België
(prijzen in EUR, landcode +32). De DRC-markt heeft de interne code "CD", de
Belgische markt de code "BE".

### Langues / Talen

FR — L'application et le support Zwibba fonctionnent en français (RDC et
Belgique) et en néerlandais (Belgique). L'agent de support répond toujours
dans la langue utilisée par le client.

NL — De Zwibba-app en -ondersteuning werken in het Frans (DRC en België) en
het Nederlands (België). De supportagent antwoordt altijd in de taal van de
klant.
`.trim();
