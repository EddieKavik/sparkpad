import { useEffect, useState } from 'react';
import { Paper, Title, Text, Group, Stack, Loader, Divider, Button, Checkbox, Table, Notification } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';

export default function OrchestratorBulkActions() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ logIdx: number; actionIdx: number }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { fetchLogs(); }, []);

  // Find all suggested actions
  const suggested = logs.flatMap((log, logIdx) =>
    (log.actions || []).map((action: any, actionIdx: number) =>
      log.results && log.results[actionIdx]?.status === 'suggested'
        ? { logIdx, actionIdx, action, info: log.results[actionIdx]?.info, timestamp: log.timestamp }
        : null
    ).filter(Boolean)
  );

  const isSelected = (logIdx: number, actionIdx: number) =>
    selected.some(sel => sel.logIdx === logIdx && sel.actionIdx === actionIdx);

  const toggleSelect = (logIdx: number, actionIdx: number) => {
    setSelected(sel =>
      isSelected(logIdx, actionIdx)
        ? sel.filter(s => !(s.logIdx === logIdx && s.actionIdx === actionIdx))
        : [...sel, { logIdx, actionIdx }]
    );
  };

  const handleBulk = async (type: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      for (const { logIdx, actionIdx } of selected) {
        const action = logs[logIdx].actions[actionIdx];
        if (type === 'approve') {
          await fetch('/api/orchestrator/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
        } else {
          // Mark as rejected in orchestrator_logs
          const res = await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs');
          const logsArr = await res.json();
          if (Array.isArray(logsArr) && logsArr[logIdx] && logsArr[logIdx].results && logsArr[logIdx].results[actionIdx]) {
            logsArr[logIdx].results[actionIdx] = { action, status: 'rejected', info: 'User rejected this action (bulk)' };
            await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs', {
              method: 'POST',
              body: JSON.stringify(logsArr),
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }
      showNotification({
        title: type === 'approve' ? 'Bulk Approve' : 'Bulk Reject',
        message: `${selected.length} action(s) ${type === 'approve' ? 'approved' : 'rejected'}.`,
        color: type === 'approve' ? 'teal' : 'red',
        icon: type === 'approve' ? <IconCheck size={18} /> : <IconX size={18} />,
      });
      setSelected([]);
      await fetchLogs();
    } catch (err) {
      showNotification({
        title: 'Bulk Action Error',
        message: 'Failed to process bulk actions.',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Paper p="md" shadow="sm" withBorder>
      <Title order={3} mb="md">Bulk Approve/Reject AI Actions</Title>
      {error && <Text color="red" mb="md">{error}</Text>}
      {loading && <Loader />}
      <Stack>
        <Group gap="xs" mb="xs">
          <Button size="xs" color="teal" leftSection={<IconCheck size={14} />} disabled={selected.length === 0 || processing} onClick={() => handleBulk('approve')} loading={processing}>Approve Selected</Button>
          <Button size="xs" color="red" leftSection={<IconX size={14} />} disabled={selected.length === 0 || processing} onClick={() => handleBulk('reject')} loading={processing}>Reject Selected</Button>
          <Text size="sm" color="dimmed">{selected.length} selected</Text>
        </Group>
        <Divider my="xs" />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Info</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {suggested.length === 0 && (
                <Table.Tr><Table.Td colSpan={5}><Text color="dimmed">No suggested actions to approve/reject.</Text></Table.Td></Table.Tr>
              )}
              {suggested.map(({ logIdx, actionIdx, action, info, timestamp }, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <Checkbox checked={isSelected(logIdx, actionIdx)} onChange={() => toggleSelect(logIdx, actionIdx)} disabled={processing} />
                  </Table.Td>
                  <Table.Td>{new Date(timestamp).toLocaleString()}</Table.Td>
                  <Table.Td>{action.action}</Table.Td>
                  <Table.Td>{info}</Table.Td>
                  <Table.Td><Text size="xs">{JSON.stringify(action)}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </Stack>
    </Paper>
  );
} 