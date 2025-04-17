// src/app/api/emails/route.js
import { NextResponse } from 'next/server';
import dbConnect from '../../lib/dbConnect';
import Email from '../../models/Email';

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const emailQuery = searchParams.get('email') || '';
    const filter = emailQuery
      ? { email: { $regex: new RegExp(emailQuery, 'i') } }
      : {};

    // .lean() gives plain JSON objects
    const docs = await Email.find(filter)
                            .sort({ sent_at: -1 })
                            .lean();

    return NextResponse.json(docs);
  } catch (error) {
    console.error('App Router /api/emails error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}