// pages/api/emails.js
import dbConnect from '../../lib/dbConnect';
import Email from '../../models/Email';

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { email } = req.query;
    const filter = email
      ? { email: { $regex: new RegExp(email, 'i') } }
      : {};

    console.log('[api/emails] filter →', filter);
    const docs = await Email.find(filter)
                            .sort({ sent_at: -1 })
                            .lean();
    console.log(`[api/emails] found ${docs.length} docs`);

    return res.status(200).json(docs);
  } catch (error) {
    console.error("[api/emails] ERROR", error);
    return res.status(500).json({ error: 'Database error' });
  }
}