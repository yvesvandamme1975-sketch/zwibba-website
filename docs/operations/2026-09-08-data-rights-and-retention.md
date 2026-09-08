# Zwibba — traitement manuel des droits et conservation

**Responsable :** Yves Van Damme, Aïves Consulting. **Contact :** hello@aivesconsulting.com. Politique opérationnelle adoptée pour la finalisation demandée le 8 septembre 2026. Ce document ne prétend pas qu'une purge historique a déjà eu lieu.

## Demande et traçabilité

À réception d'une demande d'accès, rectification, opposition ou suppression, créer un dossier privé : date de réception, compte concerné, droit demandé, périmètre, responsable, échéance et résultat. Ne pas placer les données du demandeur dans Git. Répondre au plus tard dans un mois ; pour la RDC retenir aussi la limite de 30 jours. Toute extension doit être motivée et notifiée avant cette échéance. Ne pas conditionner un droit à un nouveau consentement aux CGU. Une réclamation reste possible même sans compte actif.

Vérifier l'identité avec les informations déjà détenues et le contrôle du numéro du compte lorsque c'est nécessaire. Ne jamais demander son code OTP au demandeur et ne pas collecter systématiquement de pièce d'identité. En cas de doute raisonnable, demander seulement la preuve complémentaire proportionnée et expliquer le motif. Un accès aux données d'un tiers doit être expurgé.

## Ciblage technique et inventaire

Utiliser `schema.prisma` au commit réellement déployé. Vérifier avant toute connexion le projet Railway **zwibba-production**, environnement **production**, et la correspondance entre DATABASE_URL de l'API et le service Postgres. Le worktree temporaire peut hériter d'un autre projet Railway : aucun ciblage implicite n'est acceptable. Conserver les secrets uniquement dans l'environnement du processus, jamais dans un rapport.

Repérer User par son identifiant et son numéro vérifiés. Inventorier sans mutation : User, Session, TermsAcceptance ; Draft et DraftPhoto via ownerPhoneNumber ; Listing et ses relations ; Review/ReviewReport via buyerUserId/reporterUserId/sellerPhoneNumber ; ChatThread via buyerUserId/sellerPhoneNumber puis ChatMessage ; WalletTransaction et BoostPurchase via userId ; OtpChallenge et VerificationAttempt via phoneNumber ; SupportConversation/Message/ActionLog via waId/matchedPhoneNumber ; ListingPriceEvent via draftId/listingId ; ListingLifecycleEvent via listingId/actorPhoneNumber. Rechercher aussi les coordonnées dans le texte libre de SearchQueryEvent, sans prétendre pouvoir attribuer automatiquement toutes les recherches à une personne.

Photographier la liste des identifiants et objets R2 concernés dans un stockage privé à accès limité. Un export ne contient ni jeton de session, ni empreinte OTP, ni secret technique, ni messages d'un tiers sans examen de ses droits. Transmettre uniquement par un canal vérifié et limiter l'accès à l'export.

## Suppression ou minimisation

Avant exécution, documenter pour chaque catégorie : suppression, anonymisation irréversible, ou conservation restreinte avec finalité précise, texte applicable et date de fin/réexamen. Une obligation de preuve ne justifie pas de conserver tout le compte. Aucune conservation « au cas où » sans motif.

Préparer une transaction PostgreSQL ciblée avec préconditions sur l'identité et sur le nombre de lignes attendu. Inspecter les cascades : supprimer User ou Draft peut effacer conversations, avis et pièces liées aux droits d'autres personnes. TermsAcceptance a une relation Restrict : ne pas contourner cette protection avant décision sur les preuves. Vérifier la restauration disponible avant une suppression irréversible. Tester le scénario sur données fictives isolées puis faire relire la transaction exacte. Ne pas utiliser une purge générale pour répondre à une demande individuelle.

Révoquer les sessions du compte fermé. Retirer l'affichage public des annonces concernées. Après validation de la transaction, supprimer les objets R2 devenus inutiles (photos, images de partage/story) en vérifiant qu'aucune autre annonce ne les référence. Contrôler les URL publiques et demander l'invalidation des caches concernés. Les copies déjà partagées sur des services tiers ne sont pas sous le contrôle de Zwibba : l'expliquer au demandeur sans prétendre les avoir supprimées.

Vérifier les lignes et URL restantes, conserver une preuve minimale du traitement de la demande, informer le demandeur du résultat et des exceptions motivées. En cas d'erreur, ne pas annoncer la suppression comme terminée.

## Critères par catégorie et déclencheurs

- Compte/profil : nécessité de fournir un compte utilisé. Réexaminer à la clôture, à la demande de l'utilisateur ou lorsque son usage a cessé ; supprimer/minimiser ce qui n'est plus utile. Ne pas déduire l'activité du seul updatedAt de User : tenir compte des sessions et des opérations réelles.
- Brouillons, annonces, photos et visuels : nécessité de préparer ou publier l'annonce. Réexaminer au retrait/à l'abandon et à la clôture du compte. Une restauration demandée ou un litige identifié peut justifier une conservation limitée documentée.
- Messages/avis : échanges et information associés aux annonces. À fin d'échange ou clôture, examiner les droits de chaque participant ; retirer ou anonymiser les données devenues inutiles. Ne pas effacer les preuves d'un litige identifié sans examen.
- OTP, tentatives, sessions : connexion et sécurité. Expiration n'est pas effacement. À l'expiration/consommation/révocation, supprimer les éléments sans utilité de sécurité restante ; un incident identifié a un dossier avec date de clôture/réexamen.
- Recherches et journaux de prix : mesure et diagnostic documentés. Une fois l'analyse achevée, supprimer le texte brut et les identifiants ou agréger irréversiblement. Une statistique encore rattachable à une annonce n'est pas anonyme.
- CGU, mouvements du solde et modération : conserver les seules preuves nécessaires à l'obligation applicable ou à un litige, sous accès restreint. Fixer une date de fin selon le délai applicable au dossier ; réexaminer à sa résolution. Le portefeuille ne contient pas de paiement marchand et ne justifie pas automatiquement une durée comptable appliquée à toute donnée.
- Demandes d'assistance : jusqu'au traitement de la demande, puis uniquement les éléments nécessaires à son suivi ou à la défense d'un droit identifié.
- Sauvegardes : ne pas remettre en usage une donnée effacée lors d'une restauration ; tenir un journal privé minimal des effacements à réappliquer. Vérifier la politique de rotation effective du prestataire avant d'annoncer une durée. Aucune garantie de purge immédiate de chaque sauvegarde n'est donnée.

## Délais retenus pour la nouvelle politique

Revue manuelle des échéances par Yves au moins mensuelle et à réception de chaque demande. Les délais sont des choix de minimisation du service, pas une reproduction présumée des prescriptions légales : compte après clôture 30 jours (examen de clôture après 24 mois d’inactivité), annonces/photos 90 jours après retrait définitif, brouillon abandonné après 12 mois sans modification puis 90 jours, messages/assistance 12 mois après dernier échange, avis90jours après retrait annonce, OTP/tentatives/sessions expirées30jours, recherches brutes30jours, journaux prix/cycle/modération12mois. Preuves CGU et solde3ans après clôture sous accès restreint, sauf obligation précise ou litige identifié avec pièces minimales et échéance mensuellement réexaminée. Ce plafond3ans est un choix de conservation, pas une affirmation du délai de prescription en Belgique ou en RDC.

À la première application, inventorier les données historiques avant toute suppression et traiter les échéances déjà dépassées ; une annonce historiquement masquée n’est pas automatiquement abandonnée. Aucun effacement de vrai compte n’est nécessaire à la recette de publication. L’inventaire agrégé read-only du8septembre confirme l’accès à la bonne base : 8comptes,174sessions,233brouillons,231annonces,19challengesOTP,188tentatives,0recherches,0conversations/messages support,44fils/80messages. Il ne démontre aucune purge. Les sessions héritées sans expiresAt doivent être examinées et révoquées de façon ciblée ; ne pas les considérer supprimées du seul fait du TTL des nouvelles sessions.

Ces critères imposent des opérations manuelles à chaque événement décrit. Il n'existe pas de tâche automatique de purge générale ; cette limite est indiquée dans la notice. Les automatisations Aïves déjà prévues pour les demandes entrantes ne sont pas une preuve qu'un effacement particulier a été exécuté. Les demandes et opérations doivent être suivies jusqu'à leur résultat vérifié.

## Analyse de l'intérêt légitime

Finalités : sécurité, prévention des abus, modération, diagnostic et mesure du service. Éviter la collecte de texte personnel dans les recherches ; ne pas réutiliser les données pour une publicité individualisée. Les intérêts du service ne prévalent pas automatiquement : examiner une opposition individuellement, limiter les accès, supprimer les données sans nécessité et conserver la justification de toute exception. Les propositions IA sont modifiables ; les refus de complétude peuvent être contestés auprès d'une personne à l'adresse de contact.
