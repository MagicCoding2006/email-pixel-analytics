// src/app/api/emails/route.js
import { NextResponse } from 'next/server';
import { getTrackerDb, getMetaDb } from '../../lib/dbConnect';
import EmailModel from '../../models/Email';    // ← make sure this path is correct
import { trackingSummary } from '../../lib/emailTracking';

export async function GET(request) {
  try {
    // 1) connect to both DBs
    const trackerConn = await getTrackerDb();
    const metaConn    = await getMetaDb();

    // 2) bind models
    const TrackerEmail = trackerConn.model('Email', EmailModel.schema, 'emails');
    const MetaEmail    = metaConn.model('Email',    EmailModel.schema, 'emails');

    // 3) build filter
    const { searchParams } = new URL(request.url);
    const emailQuery = searchParams.get('email') || '';
    const emailPattern = emailQuery
      ? new RegExp(emailQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    // 4) fetch both sets
    const [trackerDocs, metaDocs] = await Promise.all([
      TrackerEmail.find({}).lean(),
      MetaEmail.find({}).lean(),
    ]);

    // 5) include metadata records that have not received tracker events yet
    const mergedMap = new Map(metaDocs.map(doc => [doc._id, { ...doc, events: [] }]));

    // 6) prefer metadata fields, keeping tracker data when metadata is missing
    trackerDocs.forEach(doc => mergedMap.set(doc._id, {
      ...doc,
      ...mergedMap.get(doc._id),
      _id: doc._id,
      events: doc.events || [],
    }));
    // Filter after joining so tracker records without an email retain their events.
    const now = new Date();
    const merged = Array.from(mergedMap.values())
      .filter(doc => !emailPattern || emailPattern.test(doc.email || ''))
      .map(doc => trackingSummary(doc, now));

    return NextResponse.json(merged);
  } catch (error) {
    console.error('/api/emails dual-DB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
