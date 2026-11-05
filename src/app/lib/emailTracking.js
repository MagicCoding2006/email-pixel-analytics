// The hosted tracker writes UTC ISO strings without a timezone suffix.
// Normalize them before comparison or serialization; explicit offsets stay intact.
export function parseTimestamp(value) {
  if (!value) return null;
  let normalized = value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    normalized = `${value.replace(" ", "T")}Z`;
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function trackingSummary(email, now = new Date()) {
  const status = email.send_status || (email.sent_at ? "sent" : "draft");
  const sentAt = status === "sent" ? parseTimestamp(email.sent_at) : null;
  const events = (email.events || []).flatMap(event => {
    const timestamp = parseTimestamp(event.timestamp);
    if (!sentAt || !timestamp || timestamp <= sentAt || timestamp > now) return [];
    return [{ ...event, timestamp: timestamp.toISOString() }];
  });
  return {
    ...email,
    send_status: status,
    sent_at: sentAt?.toISOString() || null,
    created_at: parseTimestamp(email.created_at)?.toISOString() || null,
    events,
    ignored_events: (email.events || []).length - events.length,
  };
}
