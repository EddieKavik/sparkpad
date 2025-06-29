import { useEffect, useState } from 'react';
import { Paper, Title, Text, Group, Stack, Badge, Loader, Divider, Table } from '@mantine/core';
import { BarChart } from '@mantine/charts';

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function OrchestratorAnalytics() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Error fetching logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Flatten all actions/results
  const allActions = logs.flatMap(log => log.actions || []);
  const allResults = logs.flatMap(log => log.results || []);

  // Analytics
  const statusCounts = groupBy(allResults, r => r.status || 'unknown');
  const typeCounts = groupBy(allActions, a => a.action || 'unknown');

  // Actions per day (by log timestamp)
  const actionsByDay = groupBy(logs, log => new Date(log.timestamp).toLocaleDateString());
  const barData = Object.entries(actionsByDay).map(([date, count]) => ({ date, count }));

  return (
    <Paper p="md" shadow="sm" withBorder>
      <Title order={3} mb="md">AI Orchestrator Analytics</Title>
      {error && <Text color="red" mb="md">{error}</Text>}
      {loading && <Loader />}
      <Stack>
        <Group gap="md">
          <Stack>
            <Text fw={500}>Total Actions by Status</Text>
            <Group gap={8}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} color={status === 'success' ? 'green' : status === 'approved' ? 'teal' : status === 'suggested' ? 'blue' : status === 'rejected' ? 'gray' : status === 'undone' ? 'yellow' : status === 'error' ? 'red' : 'gray'} size="lg">
                  {status}: {count}
                </Badge>
              ))}
            </Group>
          </Stack>
          <Stack>
            <Text fw={500}>Actions by Type</Text>
            <Group gap={8}>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} color="blue" size="lg">{type}: {count}</Badge>
              ))}
            </Group>
          </Stack>
        </Group>
        <Divider my="md" />
        <Text fw={500} mb={4}>Actions Per Day</Text>
        <BarChart
          data={barData}
          dataKey="date"
          series={[{ name: 'count', color: 'blue.6' }]}
          yAxisLabel="Actions"
          orientation="vertical"
          h={220}
        />
        <Divider my="md" />
        <Text fw={500} mb={4}>Recent Actions</Text>
        <Table striped highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Info</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {logs.slice(0, 10).map((log, idx) => (
              (log.actions || []).map((action: any, i: number) => (
                <Table.Tr key={idx + '-' + i}>
                  <Table.Td>{new Date(log.timestamp).toLocaleString()}</Table.Td>
                  <Table.Td>{action.action}</Table.Td>
                  <Table.Td>
                    <Badge color={log.results && log.results[i]?.status === 'success' ? 'green' : log.results && log.results[i]?.status === 'approved' ? 'teal' : log.results && log.results[i]?.status === 'suggested' ? 'blue' : log.results && log.results[i]?.status === 'rejected' ? 'gray' : log.results && log.results[i]?.status === 'undone' ? 'yellow' : log.results && log.results[i]?.status === 'error' ? 'red' : 'gray'}>
                      {log.results && log.results[i]?.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{log.results && log.results[i]?.info}</Table.Td>
                </Table.Tr>
              ))
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
} 