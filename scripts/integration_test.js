#!/usr/bin/env node
/**
 * End-to-end integration test for the Shiparoo API.
 *
 * Runs against the real API over HTTP (no mocks) and walks the core
 * marketplace flow the app uses (endpoints per src/services/api.js):
 *
 *   1.  register a shipper             POST /api/v1/auth/register
 *   2.  log in as the shipper          POST /api/v1/auth/login
 *   3.  fetch the shipper profile       GET  /api/v1/auth/me
 *   4.  create a load                  POST /api/v1/loads
 *   5.  publish the load               POST /api/v1/loads/:id/publish
 *   6.  register a carrier              POST /api/v1/auth/register
 *   7.  carrier fetches the load       GET  /api/v1/loads/:id
 *   8.  load appears on the board      GET  /api/v1/loads
 *   9.  load appears in shipper loads  GET  /api/v1/loads/mine
 *   10. carrier places a bid           POST /api/v1/bids
 *   11. shipper sees the bid           GET  /api/v1/loads/:id/bids
 *   12. shipper awards the load        POST /api/v1/loads/:id/award/:bidId
 *   13. load shows as awarded          GET  /api/v1/loads/:id
 *
 * The load is cancelled afterwards (best effort) so the run does not leave
 * a published test load on the board.
 *
 * Configuration:
 *   API_BASE_URL - base URL of the API (default: http://localhost:3000,
 *                  the same default src/services/api.js uses)
 *
 * Exit code: 0 when every step passes, 1 on any failure.
 *
 * The test only creates its own data (throwaway users with random emails,
 * one bid, and one load); it needs no real accounts, credentials, or
 * secrets.
 */

'use strict';

const BASE = (process.env.BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const randomId = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

async function api(method, path, { token, body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (err) {
    throw new Error(`cannot reach the API at ${BASE} (${err.cause?.message || err.message})`);
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, json, text };
}

function expect(condition, message, detail) {
  if (!condition) {
    throw new Error(detail === undefined ? message : `${message} [${detail}]`);
  }
}

// List endpoints return either a bare array or a wrapped one; accept both.
function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['loads', 'bids', 'items', 'results', 'data']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

// Single-object endpoints return either the object or { <name>: object }.
function unwrap(payload, key) {
  if (!payload || typeof payload !== 'object') return null;
  return payload[key] || payload;
}

async function step(name, fn) {
  process.stdout.write(`  ${name} ... `);
  try {
    await fn();
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    throw err;
  }
}

async function main() {
  console.log('Shiparoo API end-to-end test');
  console.log(`API base URL: ${BASE}`);

  const runId = randomId();
  const password = `ItTest-${runId}!x7`;

  // Mirrors the payload built by src/screens/auth/RegisterScreen.js:
  // role, names, email, phone, password — plus companyName and mcNumber
  // for carriers. (The confirm-password field is client-side only.)
  const shipper = {
    role: 'shipper',
    firstName: 'Integration',
    lastName: 'Shipper',
    email: `it-shipper-${runId}@example.com`,
    phone: '512-555-0100',
    password,
  };
  const carrier = {
    role: 'carrier',
    firstName: 'Integration',
    lastName: 'Carrier',
    email: `it-carrier-${runId}@example.com`,
    phone: '512-555-0101',
    password,
    companyName: 'Integration Test Trucking',
    mcNumber: String(100000 + Math.floor(Math.random() * 900000)),
  };

  const day = 24 * 60 * 60 * 1000;

  // Mirrors buildPayload() in src/screens/shipper/PostLoadScreen.js
  // Matches the API contract in shiparoo-backend src/routes/loads.js (createLoadBody).
  // NOTE: src/screens/shipper/PostLoadScreen.js still builds the older shape
  // (zip/date fields, no lat/lon, weight/offeredRateCents) - tracked separately.
  const at = (days, hour) => {
    const d = new Date(Date.now() + days * day);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const loadPayload = {
    title: 'Integration test load',
    equipmentType: 'dry_van',
    commodity: 'General Freight',
    weightLbs: 10000,
    lengthFt: 48,
    pieceCount: 1,
    hazmat: false,
    originAddress: '100 Integration Test Rd',
    originCity: 'Austin',
    originState: 'TX',
    originZip: '78701',
    originLat: 30.2672,
    originLon: -97.7431,
    pickupEarliest: at(7, 8),
    pickupLatest: at(7, 17),
    destAddress: '200 Integration Test Ave',
    destCity: 'Dallas',
    destState: 'TX',
    destZip: '75201',
    destLat: 32.7767,
    destLon: -96.797,
    deliveryEarliest: at(9, 8),
    deliveryLatest: at(9, 17),
    pricingType: 'open_bid',
    targetRateCents: 250000,
    specialInstructions: 'Temporary load created by scripts/integration_test.js',
  };

  const bidAmountCents = 235000;

  let shipperToken = null;
  let carrierToken = null;
  let loadId = null;

  try {
    await step('register shipper (POST /api/v1/auth/register)', async () => {
      const res = await api('POST', '/api/v1/auth/register', { body: shipper });
      expect(res.ok, 'register shipper failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      shipperToken = res.json?.tokens?.accessToken || null;
      expect(shipperToken, 'register shipper returned no access token');
    });

    await step('log in as shipper (POST /api/v1/auth/login)', async () => {
      const res = await api('POST', '/api/v1/auth/login', {
        body: { email: shipper.email, password: shipper.password },
      });
      expect(res.ok, 'shipper login failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      shipperToken = res.json?.tokens?.accessToken || shipperToken;
      expect(shipperToken, 'shipper login returned no access token');
    });

    await step('fetch profile (GET /api/v1/auth/me)', async () => {
      const res = await api('GET', '/api/v1/auth/me', { token: shipperToken });
      expect(res.ok, 'GET /api/v1/auth/me failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const user = unwrap(res.json, 'user');
      expect(user?.email === shipper.email, 'auth/me returned a different user', `got ${user?.email}`);
    });

    await step('create load (POST /api/v1/loads)', async () => {
      const res = await api('POST', '/api/v1/loads', { token: shipperToken, body: loadPayload });
      expect(res.ok, 'create load failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      // Same response shapes the app handles: { load: { id } } or { id }.
      loadId = unwrap(res.json, 'load')?.id ?? res.json?.id ?? null;
      expect(loadId, 'create load returned no load id');
    });

    await step('publish load (POST /api/v1/loads/:id/publish)', async () => {
      const res = await api('POST', `/api/v1/loads/${loadId}/publish`, { token: shipperToken, body: {} });
      expect(res.ok, 'publish load failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
    });

    await step('register carrier (POST /api/v1/auth/register)', async () => {
      const res = await api('POST', '/api/v1/auth/register', { body: carrier });
      expect(res.ok, 'register carrier failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      carrierToken = res.json?.tokens?.accessToken || null;
      expect(carrierToken, 'register carrier returned no access token');
    });

    await step('carrier fetches the load (GET /api/v1/loads/:id)', async () => {
      const res = await api('GET', `/api/v1/loads/${loadId}`, { token: carrierToken });
      expect(res.ok, 'carrier could not fetch the published load', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const load = unwrap(res.json, 'load');
      expect(
        (load?.origin?.city ?? load?.originCity) === 'Austin' &&
          (load?.destination?.city ?? load?.destCity) === 'Dallas',
        'fetched load has unexpected details',
        JSON.stringify(load).slice(0, 300),
      );
    });

    await step('load is on the load board (GET /api/v1/loads)', async () => {
      const res = await api('GET', '/api/v1/loads', { token: carrierToken });
      expect(res.ok, 'load board request failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const listed = asArray(res.json).some((item) => String(item?.id) === String(loadId));
      expect(listed, 'published load was not found on the load board');
    });

    await step('load is in shipper loads (GET /api/v1/loads/mine)', async () => {
      const res = await api('GET', '/api/v1/loads/mine', { token: shipperToken });
      expect(res.ok, 'my loads request failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const listed = asArray(res.json).some((item) => String(item?.id) === String(loadId));
      expect(listed, 'created load was not found in the shipper loads');
    });

    let bidId = null;

    await step('carrier places a bid (POST /api/v1/bids)', async () => {
      const res = await api('POST', '/api/v1/bids', {
        token: carrierToken,
        body: { loadId, amountCents: bidAmountCents },
      });
      expect(res.ok, 'place bid failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      bidId = unwrap(res.json, 'bid')?.id ?? res.json?.id ?? null;
    });

    await step('shipper sees the bid (GET /api/v1/loads/:id/bids)', async () => {
      const res = await api('GET', `/api/v1/loads/${loadId}/bids`, { token: shipperToken });
      expect(res.ok, 'list bids failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const bid = asArray(res.json).find((b) => Number(b?.amountCents ?? b?.amount_cents) === bidAmountCents);
      expect(bid, 'the placed bid was not found among the load bids');
      bidId = bid?.id ?? bidId;
      expect(bidId, 'the bid has no id');
    });

    await step('shipper awards the load (POST /api/v1/loads/:id/award/:bidId)', async () => {
      const res = await api('POST', `/api/v1/loads/${loadId}/award/${bidId}`, { token: shipperToken, body: {} });
      expect(res.ok, 'award failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
    });

    await step('load is awarded (GET /api/v1/loads/:id)', async () => {
      const res = await api('GET', `/api/v1/loads/${loadId}`, { token: shipperToken });
      expect(res.ok, 'refetch load failed', `HTTP ${res.status} ${res.text.slice(0, 300)}`);
      const load = unwrap(res.json, 'load');
      expect(
        load?.status === 'awarded' || load?.status === 'booked',
        'load status was not awarded/booked after awarding',
        `got ${load?.status}`,
      );
    });

    console.log('\nAll steps passed.');
  } catch (err) {
    console.error(`\nFAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // Best-effort cleanup: cancel the test load so a run (passing or
    // failing) does not leave a published load on the board. Cleanup
    // problems are reported but do not change the verdict above.
    if (loadId && shipperToken) {
      try {
        const res = await api('POST', `/api/v1/loads/${loadId}/cancel`, { token: shipperToken, body: {} });
        if (res.ok) {
          console.log('cleanup: cancelled the test load');
        } else {
          console.log(`cleanup: could not cancel the test load (HTTP ${res.status})`);
        }
      } catch {
        console.log('cleanup: could not cancel the test load');
      }
    }
  }
}

if (typeof fetch !== 'function') {
  console.error('integration_test: Node 18+ is required (global fetch is unavailable).');
  process.exitCode = 1;
} else {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
