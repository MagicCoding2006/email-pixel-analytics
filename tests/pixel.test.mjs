import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const scriptSource = await readFile(new URL('../src/app/lib/pixelScript.js', import.meta.url), 'utf8');
const { buildPixelScript } = await import(`data:text/javascript;base64,${Buffer.from(scriptSource).toString('base64')}`);
const createSource = (await readFile(new URL('../src/app/api/createPixel/route.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '').replace('export async function POST', 'async function POST');
const trackingSource = await readFile(new URL('../src/app/lib/emailTracking.js', import.meta.url), 'utf8');
const { parseTimestamp, trackingSummary } = await import(`data:text/javascript;base64,${Buffer.from(trackingSource).toString('base64')}`);
const valid = { email: 'person@example.test', subject: 'A question', bodyTemplate: 'Hello\n"quoted" `text` ${literal}' };

function createHandler({ unavailable = false, origin } = {}) {
  const inserted = [];
  const context = vm.createContext({
    NextResponse: Response, randomUUID: () => 'test-pixel-id', URL, buildPixelScript,
    process: { env: { PIXEL_TRACKER_ORIGIN: origin } },
    getMetaDb: async () => {
      if (unavailable) throw new Error('database unavailable');
      return { collection: name => {
        assert.equal(name, 'emails');
        return { insertOne: async doc => inserted.push(doc) };
      } };
    },
  });
  vm.runInContext(createSource, context);
  return { post: body => context.POST({ json: async () => body }), context, inserted };
}

test('creates one metadata record and safely embeds the message in the snippet', async () => {
  const { post, inserted } = createHandler();
  const response = await post(valid);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.id, 'test-pixel-id');
  assert.equal(new URL(result.pixelUrl).pathname, '/pixel/test-pixel-id');
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].email, valid.email);
  assert.equal(inserted[0].bodyTemplate, valid.bodyTemplate);
  assert.equal(inserted[0].events.length, 0);
  assert.equal(inserted[0].send_status, "draft");
  assert.equal(inserted[0].sent_at, null);
  assert.ok(inserted[0].created_at);
  assert.equal(result.consoleScript, buildPixelScript(valid.bodyTemplate, result.pixelUrl));
  new vm.Script(result.consoleScript);
});

test('rejects malformed, blank, invalid, and oversized input before writing', async () => {
  const { post, context, inserted } = createHandler();
  for (const body of [null, {}, { ...valid, email: 'not-an-email' }, { ...valid, subject: ' ' },
    { ...valid, bodyTemplate: 42 }, { ...valid, subject: 'a'.repeat(999) }, { ...valid, bodyTemplate: 'a'.repeat(100001) }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal((await context.POST({ json: async () => { throw new Error('invalid JSON'); } })).status, 400);
  assert.equal(inserted.length, 0);
});

test('returns a useful error on database failure and rejects non-HTTPS trackers', async () => {
  assert.equal((await createHandler({ unavailable: true }).post(valid)).status, 500);
  const { post, inserted } = createHandler({ origin: 'http://example.test' });
  assert.equal((await post(valid)).status, 500);
  assert.equal(inserted.length, 0);
});

test('honors the configured tracker origin', async () => {
  const response = await createHandler({ origin: 'https://tracker.example.test' }).post(valid);
  assert.equal((await response.json()).pixelUrl, 'https://tracker.example.test/pixel/test-pixel-id');
});

const emailsSource = (await readFile(new URL('../src/app/api/emails/route.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '').replace('export async function GET', 'async function GET');

test('includes generated emails without tracker events and joins events before literal email filtering', async () => {
  const trackerDocs = [{ _id: 'joined', events: [{ event: 'OPEN', bot_preload: false, timestamp: '2025-06-17T15:00:00' }] }, { _id: 'tracker-only', email: 'other@example.test', events: [] }];
  const metaDocs = [{ _id: 'joined', email: 'name+tag@example.test', sent_at: '2025-06-17T14:00:00Z' }, { _id: 'new-pixel', email: 'new@example.test' }];
  const connection = docs => ({ model: () => ({ find: () => ({ lean: async () => docs }) }) });
  const context = vm.createContext({
    URL, console, trackingSummary, NextResponse: Response, EmailModel: { schema: {} },
    getTrackerDb: async () => connection(trackerDocs), getMetaDb: async () => connection(metaDocs),
  });
  vm.runInContext(emailsSource, context);
  const all = await (await context.GET({ url: 'http://localhost/api/emails' })).json();
  assert.equal(all.length, 3);
  assert.equal(new Set(all.map(doc => doc._id)).size, 3);
  assert.equal(all.find(doc => doc._id === 'new-pixel').events.length, 0);
  const filtered = await (await context.GET({ url: `http://localhost/api/emails?email=${encodeURIComponent('name+tag@')}` })).json();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].events[0].event, 'OPEN');
  assert.equal((await context.GET({ url: 'http://localhost/api/emails?email=%5B' })).status, 200);
});


test('normalizes timezone-free tracker timestamps as UTC without shifting explicit offsets', () => {
  assert.equal(parseTimestamp('2026-11-05T15:43:21.535381').toISOString(), '2026-11-05T15:43:21.535Z');
  assert.equal(parseTimestamp('2026-11-05T10:43:21-05:00').toISOString(), '2026-11-05T15:43:21.000Z');
  assert.equal(parseTimestamp('2026-11-05T15:43:21Z').toISOString(), '2026-11-05T15:43:21.000Z');
  assert.equal(parseTimestamp('invalid'), null);
  assert.equal(parseTimestamp(null), null);
});

test('drafts never expose opens, and sent emails exclude pre-send, invalid, and future events', () => {
  const events = [
    { timestamp: '2026-11-05T15:43:00' },
    { timestamp: '2026-11-05T15:44:00Z' },
    { timestamp: '2026-11-05T15:45:00' },
    { timestamp: 'invalid' },
    { timestamp: '2026-11-05T15:50:00Z' },
  ];
  const now = new Date('2026-11-05T15:46:00Z');
  const draft = trackingSummary({ send_status: 'draft', sent_at: null, events }, now);
  assert.equal(draft.events.length, 0);
  assert.equal(draft.sent_at, null);
  const sent = trackingSummary({ send_status: 'sent', sent_at: '2026-11-05T15:44:00Z', events }, now);
  assert.equal(sent.events.length, 1);
  assert.equal(sent.events[0].timestamp, '2026-11-05T15:45:00.000Z');
  assert.equal(sent.ignored_events, 4);
  assert.equal(events.length, 5, 'raw event history is preserved');
});

const statusSource = (await readFile(new URL('../src/app/api/emails/[id]/send-status/route.js', import.meta.url), 'utf8'))
  .replace(/^import .*$/gm, '').replace('export async function PATCH', 'async function PATCH');
function statusHandler({ missing = false, unavailable = false } = {}) {
  const updates = [];
  const context = vm.createContext({
    NextResponse: Response, parseTimestamp,
    getMetaDb: async () => {
      if (unavailable) throw new Error('unavailable');
      return { collection: () => ({
        findOne: async () => missing ? null : { _id: 'test-id', sent_at: new Date('2025-01-01T12:00:00Z') },
        updateOne: async (filter, update) => { updates.push(update.$set); return { matchedCount: 1 }; },
      }) };
    },
  });
  vm.runInContext(statusSource, context);
  return { updates, patch: (body, id = 'test-id') => context.PATCH({ json: async () => body }, { params: Promise.resolve({ id }) }) };
}

test('send confirmation uses server time, supports correcting send time and restoring drafts', async () => {
  const { patch, updates } = statusHandler();
  const before = Date.now();
  const confirmed = await (await patch({ status: 'sent' })).json();
  assert.equal(confirmed.send_status, 'sent');
  assert.ok(new Date(confirmed.sent_at).getTime() >= before);
  assert.equal((await patch({ status: 'sent', sentAt: '2025-01-02T13:00:00Z' })).status, 200);
  assert.equal(updates[1].sent_at.toISOString(), '2025-01-02T13:00:00.000Z');
  const draft = await (await patch({ status: 'draft' })).json();
  assert.equal(draft.sent_at, null);
  assert.equal(updates[2].send_status, 'draft');
  assert.equal(updates[2].created_at.toISOString(), '2025-01-01T12:00:00.000Z');
});

test('invalid statuses and future send times cannot update metadata', async () => {
  const { patch, updates } = statusHandler();
  for (const body of [null, {}, { status: 'invalid' }, { status: 'sent', sentAt: 'invalid' }, { status: 'sent', sentAt: '2099-01-01T00:00:00Z' }]) {
    assert.equal((await patch(body)).status, 400);
  }
  assert.equal((await patch({ status: 'sent' }, '../invalid')).status, 400);
  assert.equal(updates.length, 0);
  assert.equal((await statusHandler({ missing: true }).patch({ status: 'sent' })).status, 404);
  assert.equal((await statusHandler({ unavailable: true }).patch({ status: 'sent' })).status, 500);
});
