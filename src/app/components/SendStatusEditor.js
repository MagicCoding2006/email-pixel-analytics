"use client";

import { useRef, useState } from "react";

function localDateTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function SendStatusEditor({ email, onUpdated, prominent = false }) {
  const dialog = useRef(null);
  const [status, setStatus] = useState("sent");
  const [useNow, setUseNow] = useState(true);
  const [sentAt, setSentAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isDraft = email.send_status === "draft" || !email.sent_at;

  function open() {
    setStatus("sent");
    setUseNow(isDraft);
    setSentAt(localDateTime(email.sent_at));
    setError("");
    dialog.current.showModal();
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/emails/${encodeURIComponent(email._id)}/send-status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "sent" && !useNow ? { sentAt: new Date(sentAt).toISOString() } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save send status.");
      onUpdated(data);
      dialog.current.close();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }

  return <>
    <button type="button" className={prominent ? "primary-button mark-sent-button" : "text-button send-status-button"} onClick={open}>{isDraft ? "Mark as sent" : "Edit send time"}</button>
    <dialog className="send-dialog" ref={dialog} aria-label="Update email send status" onCancel={event => { if (saving) event.preventDefault(); }}>
      <form onSubmit={save}>
        <p className="eyebrow">SEND CONFIRMATION</p><h2>When did you send it?</h2>
        <p className="send-dialog-recipient">{email.email || "This email"}</p>
        <p className="field-help">Only confirm after Gmail has sent the message. Image requests before your selected send time are excluded from open counts.</p>
        <fieldset disabled={saving}>
          <label className="radio-label"><input type="radio" name="send-status" checked={status === "sent"} onChange={() => setStatus("sent")} /> I sent this email</label>
          <label className="radio-label"><input type="radio" name="send-status" checked={status === "draft"} onChange={() => setStatus("draft")} /> Still a draft — exclude all opens</label>
          {status === "sent" && <div className="send-time-fields"><label className="radio-label"><input type="checkbox" checked={useNow} onChange={event => setUseNow(event.target.checked)} /> Use the current time</label>{!useNow && <label className="send-time-label">Actual send time<input aria-label="Actual send time" type="datetime-local" value={sentAt} onChange={event => setSentAt(event.target.value)} max={localDateTime()} required /><span className="field-help">Your browser’s local time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</span></label>}</div>}
          {error && <p className="error-banner" role="alert">{error}</p>}
          <div className="dialog-actions"><button type="button" className="refresh-button" onClick={() => dialog.current.close()}>Cancel</button><button type="submit" className="primary-button">{saving ? "Saving…" : status === "sent" ? "Confirm sent" : "Save as draft"}</button></div>
        </fieldset>
      </form>
    </dialog>
  </>;
}
