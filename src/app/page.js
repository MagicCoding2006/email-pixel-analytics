"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Heading,
  Input,
  Spinner,
  SimpleGrid,
  Stat,
  Table,
  Text
} from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Label
} from "recharts";

export default function Dashboard() {
  const [emails, setEmails]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  function parseDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/emails?email=${encodeURIComponent(filter)}`)
      .then((r) => r.json())
      .then((data) => {
        const normalized = data.map((e) => ({
          ...e,
          sent_at: parseDate(e.sent_at),
          events: (e.events || []).map((ev) => ({
            ...ev,
            timestamp: parseDate(ev.timestamp),
          })),
        }));
        setEmails(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const isOpened = (e) =>
    (e.events || []).some(
      (ev) =>
        (ev.event === "OPEN" || ev.event === "STEALTH_OPEN") &&
        ev.bot_preload === false
    );

  const totalSent   = emails.length;
  const totalOpened = emails.filter(isOpened).length;

  const bySubject = useMemo(() => {
    const map = {};
    emails.forEach((e) => {
      const key = e.subject || "(no subject)";
      if (!map[key]) map[key] = { subject: key, sent: 0, opened: 0 };
      map[key].sent++;
      if (isOpened(e)) map[key].opened++;
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

  const SubjectTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const { sent, opened, rate } = payload[0].payload;
    return (
      <Box bg="white" p={2} border="1px solid #ccc">
        <Text fontWeight="bold">{label}</Text>
        <Text>Sent: {sent}</Text>
        <Text>Opened: {opened}</Text>
        <Text>Open Rate: {rate}%</Text>
      </Box>
    );
  };

  if (loading) return <Spinner size="xl" />;

  return (
    <Box p={8}>
      <Heading mb={4}>Email Tracking Dashboard</Heading>

      <Input
        placeholder="Filter by email address…"
        mb={6}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

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

      <Heading size="md" mb={2}>Subject Performance</Heading>
      <Box mb={8} height="300px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySubject} margin={{ top: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="subject"
              interval={0}
              tick={{ angle: -45, textAnchor: "end", fontSize: 12 }}
              height={60}
            >
              <Label value="Subject" position="bottom" dy={40} />
            </XAxis>
            <YAxis />
            <Tooltip content={<SubjectTooltip />} />
            <Bar dataKey="opened" name="Opened" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Heading size="md" mb={2}>All Emails</Heading>
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
              const sentDate = e.sent_at;
              const opens = (e.events || [])
                .filter(
                  (ev) =>
                    (ev.event === "OPEN" ||
                      ev.event === "STEALTH_OPEN") &&
                    ev.bot_preload === false
                )
                .sort(
                  (a, b) =>
                    b.timestamp.getTime() - a.timestamp.getTime()
                );

              return (
                <Table.Row key={e._id}>
                  <Table.Cell>{e.email}</Table.Cell>
                  <Table.Cell>{e.subject}</Table.Cell>
                  <Table.Cell textAlign="end">
                    {sentDate
                      ? sentDate.toLocaleString("en-US", {
                          timeZone: "America/Indiana/Indianapolis",
                          year:   "numeric",
                          month:  "2-digit",
                          day:    "2-digit",
                          hour:   "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "—"}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {opens.length}
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    {opens[0]
                      ? opens[0].timestamp.toLocaleString("en-US", {
                          timeZone: "America/Indiana/Indianapolis",
                          year:   "numeric",
                          month:  "2-digit",
                          day:    "2-digit",
                          hour:   "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
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
