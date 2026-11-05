"use client";

import { useEffect, useState, useMemo } from "react";
import AppHeader from "./components/AppHeader";
import SendStatusEditor from "./components/SendStatusEditor";
import { parseTimestamp } from "./lib/emailTracking";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function Icon({ name, size = 20, ...props }) {
  const paths = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    chart: <><path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    arrow: <path d="m8 16 8-8M8 8h8v8" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function parseDate(value) {
  if (!value) return null;
  const date = parseTimestamp(value);
  return date;
}

function isHumanOpen(event) {
  return (event.event === "OPEN" || event.event === "STEALTH_OPEN") && event.bot_preload === false;
}

const dateOptions = { timeZone: "America/Indiana/Indianapolis", month: "short", day: "numeric", year: "numeric" };
const timeOptions = { timeZone: "America/Indiana/Indianapolis", hour: "numeric", minute: "2-digit" };

function DateCell({ date }) {
  return date ? <><span className="date-main">{date.toLocaleDateString("en-US", dateOptions)}</span><span className="cell-secondary">{date.toLocaleTimeString("en-US", timeOptions)}</span></> : <span className="muted">—</span>;
}

function SubjectTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { subject, sent, opened, rate } = payload[0].payload;
  return <div className="chart-tooltip"><strong>{subject}</strong><span>{opened} of {sent} emails opened</span><b>{rate}% open rate</b></div>;
}

function SubjectTick({ x, y, payload }) {
  const subject = payload.value;
  return <text x={x - 5} y={y} dy={4} textAnchor="end" fill="#535c52" style={{ fontSize: 11 }}>{subject.length > 20 ? `${subject.slice(0, 20)}…` : subject}</text>;
}

export default function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("all");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/emails?email=${encodeURIComponent(filter)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load emails. Check your connection and try again.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("The server returned an unexpected response.");
        const normalized = data.map(email => {
          const events = (email.events || []).map(event => ({ ...event, timestamp: parseDate(event.timestamp) }));
          const opens = events.filter(isHumanOpen);
          const lastOpened = opens.reduce((latest, event) => event.timestamp && (!latest || event.timestamp > latest) ? event.timestamp : latest, null);
          return { ...email, sent_at: parseDate(email.sent_at), opens: opens.length, lastOpened };
        });
        normalized.sort((a, b) => (b.sent_at?.getTime() || parseDate(b.created_at)?.getTime() || 0) - (a.sent_at?.getTime() || parseDate(a.created_at)?.getTime() || 0));
        if (!controller.signal.aborted) setEmails(normalized);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filter, revision]);

  const sentEmails = emails.filter(email => email.send_status === "sent");
  const draftCount = emails.length - sentEmails.length;
  const totalSent = sentEmails.length;
  const totalOpened = emails.filter(email => email.opens > 0).length;
  const openRate = totalSent ? (totalOpened / totalSent * 100).toFixed(1) : "0.0";
  const bySubject = useMemo(() => {
    const subjects = new Map();
    emails.filter(email => email.send_status === "sent").forEach(email => {
      const subject = email.subject || "(no subject)";
      const entry = subjects.get(subject) || { subject, sent: 0, opened: 0 };
      entry.sent++;
      if (email.opens) entry.opened++;
      subjects.set(subject, entry);
    });
    return Array.from(subjects.values(), item => ({ ...item, rate: +(item.opened / item.sent * 100).toFixed(1) }))
      .sort((a, b) => b.rate - a.rate || b.sent - a.sent);
  }, [emails]);
  const visibleEmails = emails.filter(email => status === "all" || (status === "draft" ? email.send_status === "draft" : email.send_status === "sent" && (status === "opened" ? email.opens > 0 : email.opens === 0)));
  const chartData = bySubject.slice(0, 6);
  const initialLoading = loading && !emails.length;
  const unavailable = initialLoading || Boolean(error);

  return (
    <div className="dashboard-shell">
      <AppHeader />

      <main className="dashboard-main">
        <section className="page-heading">
          <div><p className="eyebrow">YOUR EMAILS, AT A GLANCE</p><h1>A little clarity for your inbox.</h1><p className="page-description">Track your sends. Understand what gets opened.</p></div>
          <button className="refresh-button" onClick={() => setRevision(value => value + 1)} disabled={loading}><Icon name="refresh" size={16} className={loading ? "spinning" : ""} />{loading ? "Updating…" : "Refresh data"}</button>
        </section>

        <section className="metrics-grid" aria-label="Email overview" aria-busy={loading}>
          <article className="metric-card"><div className="metric-heading"><span>Emails sent</span><span className="metric-icon"><Icon name="mail" /></span></div><strong className="metric-value">{unavailable ? "—" : totalSent.toLocaleString()}</strong><p>{filter ? "Matching your email search" : `${draftCount} ${draftCount === 1 ? "draft" : "drafts"} excluded`}</p></article>
          <article className="metric-card"><div className="metric-heading"><span>Opened by people</span><span className="metric-icon green"><Icon name="eye" /></span></div><strong className="metric-value">{unavailable ? "—" : totalOpened.toLocaleString()}</strong><p><span className="tiny-dot" />Automated opens excluded</p></article>
          <article className="metric-card accent-card"><div className="metric-heading"><span>Open rate</span><span className="metric-icon orange"><Icon name="chart" /></span></div><strong className="metric-value">{unavailable ? "—" : openRate}<span className="metric-unit">%</span></strong><p>Emails with at least one human open</p></article>
        </section>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setRevision(value => value + 1)}>Try again</button></div>}

        <section className="panel performance-panel" aria-labelledby="performance-heading">
          <div className="panel-heading"><div><p className="eyebrow">WHAT RESONATES</p><h2 id="performance-heading">Subject performance</h2><p>Which subject lines get people to open?</p></div><span className="subtle-pill">Top {chartData.length} by open rate</span></div>
          {unavailable ? <div className="chart-empty">{error ? "Subject data is unavailable." : "Loading subject performance…"}</div> : chartData.length ? <>
            <div className="chart-container" style={{ height: Math.max(200, chartData.length * 48 + 32) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }} barSize={16}>
                  <CartesianGrid horizontal={false} stroke="#eceeea" strokeDasharray="4 4" />
                  <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: "#8a9088", fontSize: 11 }} />
                  <YAxis type="category" dataKey="subject" width={170} axisLine={false} tickLine={false} tick={<SubjectTick />} />
                  <Tooltip content={<SubjectTooltip />} cursor={{ fill: "#f5f5f0" }} />
                  <Bar dataKey="rate" name="Open rate" fill="#cd724b" radius={[0, 4, 4, 0]} background={{ fill: "#f5f4ef", radius: 4 }} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div><div className="chart-footer"><span><span className="legend-dot" /> Human open rate</span><span>Hover over a bar for details</span></div>
          </> : <div className="chart-empty"><Icon name="chart" size={30} /><span>No subject data to display yet.</span></div>}
        </section>

        <section className="panel email-panel" aria-labelledby="emails-heading">
          <div className="panel-heading email-heading"><div><h2 id="emails-heading">All emails <span className="count-badge">{error ? "—" : visibleEmails.length}</span></h2><p>A closer look at every send and every open.</p></div><label className="search-field"><Icon name="search" size={18} /><input type="search" aria-label="Search by email address" placeholder="Search email address…" value={filter} onChange={event => setFilter(event.target.value)} /></label></div>
          <div className="table-toolbar"><div className="status-filters" role="group" aria-label="Filter emails by open status">{[["all", "All emails"], ["opened", "Opened"], ["unopened", "Not opened"], ["draft", "Drafts"]].map(([value, label]) => <button key={value} aria-pressed={status === value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>)}</div><span className="table-note">Newest first</span></div>
          <div className="table-scroll" aria-busy={loading}>
            <table><thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Sent at</th><th className="number-cell">Human opens</th><th>Last opened</th><th>Send status</th></tr></thead><tbody>
              {unavailable ? <tr><td colSpan={7}><div className="table-empty" role="status">{error ? "Email data is unavailable. Try refreshing." : "Loading your emails…"}</div></td></tr> : visibleEmails.length ? visibleEmails.map(email => <tr key={email._id}>
                <td><div className="recipient"><span className="recipient-avatar">{(email.email || "?").charAt(0).toUpperCase()}</span><span>{email.email || "Unknown recipient"}</span></div></td>
                <td className="subject-cell">{email.subject || "(no subject)"}</td>
                <td><span className={`status-badge ${email.send_status === "draft" ? "draft" : email.opens ? "opened" : "unopened"}`}>{email.opens ? <Icon name="check" size={12} /> : <span className="status-dot" />}{email.send_status === "draft" ? "Draft" : email.opens ? "Opened" : "Not opened"}</span></td>
                <td><DateCell date={email.sent_at} /></td><td className="number-cell"><span className="open-count">{email.opens}</span></td><td><DateCell date={email.lastOpened} /></td><td><SendStatusEditor email={email} onUpdated={() => setRevision(value => value + 1)} /></td>
              </tr>) : <tr><td colSpan={7}><div className="table-empty"><Icon name="mail" size={30} /><strong>{filter || status !== "all" ? "No emails match your filters" : "No tracked emails yet"}</strong><span>{filter || status !== "all" ? "Try another address or a different status." : "Your tracked emails will appear here."}</span>{(filter || status !== "all") && <button className="text-button" onClick={() => { setFilter(""); setStatus("all"); }}>Clear filters</button>}</div></td></tr>}
            </tbody></table>
          </div>
          <div className="table-footer"><span role="status">{loading ? "Updating emails…" : error ? "Unable to update emails" : `${visibleEmails.length.toLocaleString()} ${visibleEmails.length === 1 ? "email" : "emails"}${filter ? " matching your search" : " tracked"}`}</span><span>Times shown in Indianapolis time</span></div>
        </section>
        <footer className="page-footer"><span className="footer-brand"><Icon name="mail" size={14} /> mail signal</span><span>A clearer picture of your email engagement.</span><Icon name="arrow" size={16} /></footer>
      </main>
    </div>
  );
}
