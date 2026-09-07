export type LegalDocument = {
  kind: string; locale: string; market: string; version: string; hash: string;
  content: string; title: string; path: string; effectiveAt: string;
};
export type LegalPolicy = {
  active: boolean; published: boolean; version: string; documents: LegalDocument[];
  termsFor(market: string, locale?: string): LegalDocument | null;
};
export function createLegalPolicy(options: {
  manifest: { status: string; version: string; effectiveAt?: string | null; documents: Array<{ kind: string; locale: string; market: string; file: string; sha256: string }> };
  documents: Record<string, string>; now?: Date | (() => Date);
}): LegalPolicy;
export function loadLegalCatalog(options?: { manifestUrl?: URL; now?: Date | (() => Date) }): LegalPolicy;
