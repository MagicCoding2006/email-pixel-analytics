import { NextResponse } from "next/server";
import { getMetaDb } from "../../../../lib/dbConnect";
import { parseTimestamp } from "../../../../lib/emailTracking";

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid email ID." }, { status: 400 });
  }
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Please submit valid JSON." }, { status: 400 });
  }
  const now = new Date();
  if (!body || !["draft", "sent"].includes(body.status)) {
    return NextResponse.json({ error: "Choose draft or sent." }, { status: 400 });
  }
  // An omitted timestamp means the server's current time, independent of browser clocks.
  const sentAt = body.status === "sent" ? (body.sentAt === undefined ? now : parseTimestamp(body.sentAt)) : null;
  if (body.status === "sent" && (!sentAt || sentAt > now || sentAt.getUTCFullYear() < 2000)) {
    return NextResponse.json({ error: "Choose a valid send time that is not in the future." }, { status: 400 });
  }
  try {
    const connection = await getMetaDb();
    const collection = connection.collection("emails");
    const existing = await collection.findOne({ _id: id });
    if (!existing) return NextResponse.json({ error: "No email metadata was found for this tracking record." }, { status: 404 });
    const result = await collection.updateOne({ _id: id }, { $set: {
      send_status: body.status,
      sent_at: sentAt,
      created_at: existing.created_at || existing.sent_at || now,
      send_status_updated_at: now,
    } });
    if (!result.matchedCount) return NextResponse.json({ error: "Email no longer exists." }, { status: 404 });
    return NextResponse.json({ id, send_status: body.status, sent_at: sentAt?.toISOString() || null });
  } catch {
    return NextResponse.json({ error: "Unable to update send status. Please try again." }, { status: 500 });
  }
}
