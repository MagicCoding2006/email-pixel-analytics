import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getMetaDb } from "../../lib/dbConnect";
import { buildPixelScript } from "../../lib/pixelScript";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid JSON." }, { status: 400 });
  }
  const { email, subject, bodyTemplate } = body || {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 320 ||
      typeof subject !== "string" || !subject.trim() || subject.length > 998 ||
      typeof bodyTemplate !== "string" || !bodyTemplate.trim() || bodyTemplate.length > 100000) {
    return NextResponse.json({ error: "Enter a valid recipient, subject (up to 998 characters), and message (up to 100,000 characters)." }, { status: 400 });
  }
  try {
    const origin = new URL(process.env.PIXEL_TRACKER_ORIGIN || "https://emailpixel-265072791364.us-central1.run.app");
    if (origin.protocol !== "https:") throw new Error("Tracker must use HTTPS");
    const id = randomUUID();
    const pixelUrl = new URL(`/pixel/${id}`, origin).href;
    const connection = await getMetaDb();
    await connection.collection("emails").insertOne({
      _id: id, email: email.trim(), subject: subject.trim(), bodyTemplate,
      created_at: new Date(), send_status: "draft", sent_at: null, events: [],
    });
    return NextResponse.json({ id, pixelUrl, send_status: "draft", sent_at: null, consoleScript: buildPixelScript(bodyTemplate, pixelUrl) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create the pixel. Check the database and tracker configuration, then try again." }, { status: 500 });
  }
}
