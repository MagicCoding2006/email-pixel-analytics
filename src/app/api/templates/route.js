import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const templates = await Promise.all(["Alex", "Daniel"].map(async name => ({
      id: `${name}Email`,
      name: `${name} — email template`,
      body: await readFile(path.join(process.cwd(), "public", `${name}Email.txt`), "utf8"),
    })));
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: "Unable to load message templates." }, { status: 500 });
  }
}
