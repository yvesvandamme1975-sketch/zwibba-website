import assert from 'node:assert/strict';
import test from 'node:test';

import { createProfileService } from '../App/services/profile-service.mjs';

test('profile service fetches the seller profile with the active session', async () => {
  const requests = [];
  const service = createProfileService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options) => {
      requests.push({
        options,
        url,
      });

      return {
        ok: true,
        async json() {
          return {
            area: 'Golf',
            phoneNumber: '+243990000001',
          };
        },
      };
    },
  });

  const profile = await service.fetchProfile({
    session: {
      sessionToken: 'zwibba_session_123',
    },
  });

  assert.deepEqual(profile, {
    area: 'Golf',
    phoneNumber: '+243990000001',
  });
  assert.equal(requests[0].url, 'https://api.example.test/profile');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
});

test('profile service saves the seller zone with the active session', async () => {
  const requests = [];
  const service = createProfileService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options) => {
      requests.push({
        options,
        url,
      });

      return {
        ok: true,
        async json() {
          return {
            area: 'Lubumbashi Centre',
            phoneNumber: '+243990000001',
          };
        },
      };
    },
  });

  const profile = await service.saveProfile({
    area: 'Lubumbashi Centre',
    session: {
      sessionToken: 'zwibba_session_123',
    },
  });

  assert.equal(profile.area, 'Lubumbashi Centre');
  assert.equal(requests[0].url, 'https://api.example.test/profile');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    area: 'Lubumbashi Centre',
  });
});
