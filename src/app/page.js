"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Heading,
  Input,
  Spinner,
  SimpleGrid,
  Stat,
  Table
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const [emails, setEmails]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/emails?email=${encodeURIComponent(filter)}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("[Dashboard] fetched emails:", data);
        setEmails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Dashboard] fetch error:", err);
        setLoading(false);
      });
  }, [filter]);

  // Count any non‑bot-open as a human open
  const totalSent = emails.length;
  const totalOpened = emails.filter((e) =>
    e.events.some((ev) =>
      (ev.event === "OPEN" || ev.event === "STEALTH_OPEN") &&
      ev.bot_preload === false
    )
  ).length;

  // Group by subject for chart
  const bySubject = useMemo(() => {
    const map = {};
    emails.forEach((e) => {
      const key = e.subject;
      if (!map[key]) map[key] = { subject: key, sent: 0, opened: 0 };
      map[key].sent++;
      if (e.events.some((ev) =>
        (ev.event === "OPEN" || ev.event === "STEALTH_OPEN") &&
        ev.bot_preload === false
      )) {
        map[key].opened++;
      }
    });
    return Object.values(map)
      .map(({ subject, sent, opened }) => ({
        subject,
        sent,
        opened,
        rate: +(opened / sent * 100).toFixed(1),
      }))
      .sort((a, b) => b.rate - a.rate);
  }, [emails]);

  if (loading) return <Spinner size="xl" />;

  return (
    <Box p={8}>
      <Heading mb={4}>Email Tracking Dashboard</Heading>

      {/* Summary Stats */}
      <SimpleGrid columns={[1, 2]} spacing={4} mb={8}>
        <Stat.Root>
          <Stat.Label>Total Sent</Stat.Label>
          <Stat.ValueText>{totalSent}</Stat.ValueText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Total Opened (human)</Stat.Label>
          <Stat.ValueText>{totalOpened}</Stat.ValueText>
        </Stat.Root>
      </SimpleGrid>

      {/* Open Rate by Subject Chart */}
      <Heading size="md" mb={2}>Open Rate by Subject</Heading>
      <Box mb={8} height="250px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySubject} margin={{ top: 20, bottom: 20 }}>
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <YAxis unit="%" />
            <Tooltip />
            <Bar dataKey="rate" name="Open Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Search & Table */}
      <Heading size="md" mb={2}>Search by Email</Heading>
      <Input
        placeholder="Type email address…"
        mb={4}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <Box overflowX="auto">
        <Table.Root size="sm" striped showColumnBorder>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader>Subject</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Sent At</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Human Opens</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Last Opened</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {emails.map((e) => {
              // count & sort any non‑bot STEALTH_OPEN or OPEN events
              const humanOpens = e.events
                .filter((ev) =>
                  (ev.event === "OPEN" || ev.event === "STEALTH_OPEN") &&
                  ev.bot_preload === false
                )
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                );

              return (
                <Table.Row key={e._id}>
                  <Table.Cell>{e.email}</Table.Cell>
                  <Table.Cell>{e.subject}</Table.Cell>
                  <Table.Cell textAlign="end">
                    {new Date(e.sent_at).toLocaleString()}
                  </Table.Cell>
                  <Table.Cell textAlign="end">{humanOpens.length}</Table.Cell>
                  <Table.Cell textAlign="end">
                    {humanOpens[0]
                      ? new Date(humanOpens[0].timestamp).toLocaleString()
                      : "—"}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}