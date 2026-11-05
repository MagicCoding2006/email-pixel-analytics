"use client";

import { useEffect, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import SendStatusEditor from "../components/SendStatusEditor";

export default function CreatePixel() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState("");
  const [templateError, setTemplateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const scriptRef = useRef(null);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/templates")
      .then(async response => {
        if (!response.ok) throw new Error("Templates are unavailable. You can still write your own message.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Templates are unavailable. You can still write your own message.");
        if (active) setTemplates(data);
      })
      .catch(failure => { if (active) setTemplateError(failure.message); });
    // Let this small read-only request finish; ignore results after unmount.
    return () => { active = false; };
  }, []);

  function changeTemplate(event) {
    const id = event.target.value;
    setTemplate(id);
    if (id) setMessage(templates.find(item => item.id === id).body);
    setResult(null);
    setCopyStatus("");
  }

  function changeField(setter, value) {
    setter(value);
    setResult(null);
    setCopyStatus("");
    setError("");
  }

  async function generate(event) {
    event.preventDefault();
    if (submitting.current) return;
    if (!email.trim() || !subject.trim() || !message.trim()) {
      setError("Enter a recipient, subject, and message before generating a pixel.");
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    setCopyStatus("");
    setResult(null);
    try {
      const response = await fetch("/api/createPixel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), subject: subject.trim(), bodyTemplate: message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate your pixel. Please try again.");
      setResult(data);
    } catch (failure) {
      setError(failure.message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(result.consoleScript);
      setCopyStatus("Copied to clipboard");
    } catch {
      scriptRef.current?.focus();
      scriptRef.current?.select();
      setCopyStatus("Script selected. Press ⌘C on Mac or Ctrl+C on Windows to copy.");
    }
  }

  return <div className="dashboard-shell"><AppHeader /><main className="dashboard-main pixel-main">
    <section className="page-heading"><div><p className="eyebrow">FROM MESSAGE TO MEASUREMENT</p><h1>Give your next email a signal.</h1><p className="page-description">Create a tracking pixel and a ready-to-paste Gmail script.</p></div><span className="subtle-pill">Gmail compose</span></section>
    <div className="pixel-grid">
      <section className="panel pixel-form-panel" aria-labelledby="compose-heading">
        <div className="panel-heading"><div><p className="eyebrow">01 / PREPARE YOUR MESSAGE</p><h2 id="compose-heading">Make it personal.</h2><p>Pick a template or start with a blank message.</p></div></div>
        <form className="pixel-form" onSubmit={generate}>
          <fieldset disabled={loading}>
            <label htmlFor="pixel-email">Recipient email</label><input id="pixel-email" type="email" autoComplete="email" placeholder="someone@example.com" required maxLength={320} value={email} onChange={event => changeField(setEmail, event.target.value)} />
            <label htmlFor="pixel-subject">Subject line</label><input id="pixel-subject" placeholder="A quick question for you" required maxLength={998} value={subject} onChange={event => changeField(setSubject, event.target.value)} />
            <label htmlFor="pixel-template">Message template <span>Optional</span></label><select id="pixel-template" value={template} onChange={changeTemplate}><option value="">Write your own</option>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            {templateError && <p className="field-help" role="status">{templateError}</p>}
            <div className="message-label"><label htmlFor="pixel-message">Email body</label><span>{message.length.toLocaleString()} characters</span></div><textarea id="pixel-message" rows={12} required maxLength={100000} placeholder="Hi there,&#10;&#10;Write your message here…" value={message} onChange={event => changeField(setMessage, event.target.value)} />
            <p className="field-help">Personalize any template placeholders before generating your script.</p>
            <button type="submit" className="primary-button">{loading ? "Creating your pixel…" : "Generate pixel & script"}<span aria-hidden="true">↗</span></button>
          </fieldset>
          <p className="form-note">Creates a draft. Open tracking stays paused until you confirm it was sent.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
        </form>
      </section>
      <div className="pixel-sidebar">
        <section className={`panel script-panel ${result ? "script-ready" : ""}`} aria-labelledby="script-heading">
          <div className="panel-heading"><div><p className="eyebrow">02 / YOUR INJECTION SCRIPT</p><h2 id="script-heading">{result ? "Ready when you are." : "A tiny pixel. A useful signal."}</h2></div>{result && <span className="status-badge opened">Generated</span>}</div>
          {result ? <div className="script-result">
            <p className="field-help">Created for <strong>{email}</strong>. The script appends your message and a 1 × 1 pixel to your open Gmail draft.</p>
            <label className="script-label" htmlFor="generated-script">Gmail console script</label><textarea id="generated-script" ref={scriptRef} readOnly value={result.consoleScript} rows={13} spellCheck={false} />
            <button type="button" className="primary-button" onClick={copyScript}>Copy script<span aria-hidden="true">⧉</span></button>
            <p className="copy-status" role="status">{copyStatus}</p>
            <div className="send-confirmation"><strong>{result.send_status === "sent" ? "Marked as sent" : "Tracking is paused"}</strong><p>{result.send_status === "sent" ? "Only image requests after your confirmed send time count as opens." : "After Gmail sends your email, confirm below. Requests made while composing will be excluded."}</p><SendStatusEditor prominent email={{ _id: result.id, email, sent_at: result.sent_at, send_status: result.send_status }} onUpdated={data => setResult(current => ({ ...current, ...data }))} /></div>
            <details className="pixel-details"><summary>View pixel URL</summary><code>{result.pixelUrl}</code></details>
          </div> : <div className="script-placeholder"><span className="pixel-illustration" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></span><strong>Your script will appear here</strong><p>Add your recipient and message, then generate a unique pixel for this email.</p></div>}
        </section>
        <section className="instructions-panel" aria-labelledby="instructions-heading"><p className="eyebrow">THE LAST FEW STEPS</p><h2 id="instructions-heading">From here to Gmail.</h2><ol><li><span>1</span><div><strong>Open a single Gmail draft</strong><p>Enter the same recipient and subject you used here.</p></div></li><li><span>2</span><div><strong>Paste the script in the console</strong><p>Open your browser’s developer tools and select Console. Paste the generated script and run it.</p></div></li><li><span>3</span><div><strong>Review, then send</strong><p>The script appends your message and pixel. Check your draft and send it. Then return here and click Mark as sent, or do it in Overview.</p></div></li></ol><p className="tracking-note">Only image loads after your confirmed send time count toward opens. Image blocking, caching, and privacy features can affect results.</p></section>
      </div>
    </div>
  </main></div>;
}
