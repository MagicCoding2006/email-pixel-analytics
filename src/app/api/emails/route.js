// src/app/api/emails/route.js
import { NextResponse } from 'next/server';
import { getTrackerDb, getMetaDb } from '../../lib/dbConnect';
import EmailModel from '../../models/Email';    // ← make sure this path is correct

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
    const filter = emailQuery
      ? { email: { $regex: new RegExp(emailQuery, 'i') } }
      : {};

    // 4) fetch both sets
    const [trackerDocs, metaDocs] = await Promise.all([
      TrackerEmail.find(filter).lean(),
      MetaEmail.find(filter).lean(),
    ]);

    // 5) map meta by _id
    const metaMap = Object.fromEntries(metaDocs.map(d => [d._id, d]));

    // 6) merge: ALL fields (including sent_at) from meta + events from tracker
    const merged = trackerDocs.map(t => ({
      ...metaMap[t._id],  // email, subject, html, sent_at, etc.
      events: t.events    // only the opens array comes from tracker
    }));

    return NextResponse.json(merged);
  } catch (error) {
    console.error('/api/emails dual-DB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}