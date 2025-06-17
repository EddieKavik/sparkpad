"use client";
import { useEffect, useState } from "react";
import { Table, Loader, Text, Notification, Title, Group, Badge } from "@mantine/core";

interface BroadcastLog {
  id?: string;
  directive_id: string;
  broadcast_timestamp: string;
  broadcaster_user_id: string;
  target_group_ids_used: string[];
  number_of_recipients: number;
  success_status: string;
}

export default function BroadcastLogsPage() {
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/broadcast-logs");
        if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch logs");
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <Title order={2} mb="lg">Broadcast Logs</Title>
      {loading ? (
        <Loader />
      ) : error ? (
        <Notification color="red">{error}</Notification>
      ) : logs.length === 0 ? (
        <Text color="dimmed">No broadcast logs found.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>Directive ID</th>
              <th>Broadcast Time</th>
              <th>Broadcaster</th>
              <th>Target Groups</th>
              <th>Recipients</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={log.id || idx}>
                <td>{log.directive_id}</td>
                <td>{log.broadcast_timestamp ? new Date(log.broadcast_timestamp).toLocaleString() : ""}</td>
                <td>{log.broadcaster_user_id}</td>
                <td>
                  <Group gap={4}>
                    {log.target_group_ids_used?.map((id: string) => (
                      <Badge key={id} color="blue" size="sm">{id}</Badge>
                    ))}
                  </Group>
                </td>
                <td>{log.number_of_recipients}</td>
                <td>
                  <Badge color={log.success_status === "completed" ? "green" : "red"}>
                    {log.success_status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
} 