import { createLegalPolicy } from '../../assets/legal/catalog.mjs';
export { LEGAL_POLICY } from '../../src/auth/legal-policy.ts';

// Non-legal feature tests deliberately run without a terms gate, independent of release dates.
export const inactiveLegalPolicy = createLegalPolicy({ manifest: { status: 'draft', version: 'test-inactive', documents: [] }, documents: {} });
