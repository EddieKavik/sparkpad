import { useEffect, useState } from 'react';
import { Paper, Title, Text, Group, Stack, Loader, Divider, Select, TextInput, Button } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconDownload } from '@tabler/icons-react';
import { safeJsonParse } from '../utils/safeJsonParse';

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function toCSV(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(',')));
  return csv.join('\n');
}

export default function OrchestratorAdvancedAnalytics() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filters
  const [user, setUser] = useState<string | null>(null);
  const [project, setProject] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const text = await res.text();
        const data = text ? safeJsonParse(text, []) : [];
        setLogs(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Error fetching logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Flatten all actions/results with context
  const allRows = logs.flatMap(log => (log.actions || []).map((action: any, i: number) => ({
    ...action,
    ...((log.results && log.results[i]) || {}),
    user: log.user || '',
    project: log.project || '',
    timestamp: log.timestamp,
  })));

  // Filtered rows
  const filteredRows = allRows.filter(row => {
    if (user && row.user !== user) return false;
    if (project && row.project !== project) return false;
    if (actionType && row.action !== actionType) return false;
    if (status && row.status !== status) return false;
    if (dateRange[0] && new Date(row.timestamp) < dateRange[0]) return false;
    if (dateRange[1] && new Date(row.timestamp) > dateRange[1]) return false;
    return true;
  });

  // Unique options
  const userOptions = Array.from(new Set(allRows.map(r => r.user).filter(Boolean))).map(u => ({ value: u, label: u }));
  const projectOptions = Array.from(new Set(allRows.map(r => r.project).filter(Boolean))).map(p => ({ value: p, label: p }));
  const actionTypeOptions = Array.from(new Set(allRows.map(r => r.action).filter(Boolean))).map(a => ({ value: a, label: a }));
  const statusOptions = Array.from(new Set(allRows.map(r => r.status).filter(Boolean))).map(s => ({ value: s, label: s }));

  // Intervention rates
  const total = filteredRows.length;
  const approved = filteredRows.filter(r => r.status === 'approved').length;
  const rejected = filteredRows.filter(r => r.status === 'rejected').length;
  const undone = filteredRows.filter(r => r.status === 'undone').length;
  const interventionRate = total ? ((approved + rejected + undone) / total * 100).toFixed(1) : '0.0';

  // Export handlers
  const handleExportCSV = () => {
    const csv = toCSV(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orchestrator_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleExportJSON = () => {
    const json = JSON.stringify(filteredRows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orchestrator_logs.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper p="md" shadow="sm" withBorder>
      <Title order={3} mb="md">Advanced Orchestrator Analytics</Title>
      {error && <Text color="red" mb="md">{error}</Text>}
      {loading && <Loader />}
      <Stack>
        <Group gap="xs">
          <Select placeholder="User" data={userOptions} value={user} onChange={setUser} clearable searchable size="xs" style={{ minWidth: 120 }} />
          <Select placeholder="Project" data={projectOptions} value={project} onChange={setProject} clearable searchable size="xs" style={{ minWidth: 120 }} />
          <Select placeholder="Action type" data={actionTypeOptions} value={actionType} onChange={setActionType} clearable searchable size="xs" style={{ minWidth: 120 }} />
          <Select placeholder="Status" data={statusOptions} value={status} onChange={setStatus} clearable searchable size="xs" style={{ minWidth: 100 }} />
          <DatePicker type="range" value={dateRange} onChange={setDateRange} placeholder="Date range" size="xs" style={{ minWidth: 180 }} />
          {(user || project || actionType || status || dateRange[0] || dateRange[1]) && (
            <Button size="xs" variant="light" color="gray" onClick={() => { setUser(null); setProject(null); setActionType(null); setStatus(null); setDateRange([null, null]); }}>Clear Filters</Button>
          )}
        </Group>
        <Divider my="xs" />
        <Group gap="md">
          <Text fw={500}>Intervention Rate:</Text>
          <Text>{interventionRate}%</Text>
          <Text color="teal">Approved: {approved}</Text>
          <Text color="red">Rejected: {rejected}</Text>
          <Text color="yellow">Undone: {undone}</Text>
        </Group>
        <Group gap="xs" mt="xs">
          <Button size="xs" leftSection={<IconDownload size={14} />} onClick={handleExportCSV}>Export CSV</Button>
          <Button size="xs" leftSection={<IconDownload size={14} />} onClick={handleExportJSON}>Export JSON</Button>
        </Group>
        <Divider my="xs" />
        <Text fw={500} mb={4}>Filtered Actions ({filteredRows.length})</Text>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
                <th>Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i}>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.user}</td>
                  <td>{row.project}</td>
                  <td>{row.action}</td>
                  <td>{row.status}</td>
                  <td>{row.info}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Stack>
    </Paper>
  );
} 