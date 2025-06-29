import { useEffect, useState } from 'react';
import { Paper, Title, Text, Stack, Group, Badge, Loader, Button, Divider, ScrollArea, Select, TextInput, ActionIcon } from '@mantine/core';
import { IconCheck, IconX, IconHistory, IconThumbUp, IconThumbDown, IconMessage } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { safeJsonParse } from '../utils/safeJsonParse';

function uniqueActionTypes(logs: any[]): string[] {
  const types = new Set<string>();
  logs.forEach(log => {
    (log.actions || []).forEach((a: any) => types.add(a.action));
  });
  return Array.from(types);
}

function uniqueStatuses(logs: any[]): string[] {
  const statuses = new Set<string>();
  logs.forEach(log => {
    (log.results || []).forEach((r: any) => statuses.add(r.status));
  });
  return Array.from(statuses);
}

function Feedback({ feedbackKey }: { feedbackKey: string }) {
  const [feedback, setFeedback] = useState(() => {
    return safeJsonParse(localStorage.getItem(feedbackKey) || '{}', {});
  });
  const handleFeedback = (type: 'up' | 'down') => {
    const newFeedback = { ...feedback, [type]: (feedback[type] || 0) + 1 };
    setFeedback(newFeedback);
    localStorage.setItem(feedbackKey, JSON.stringify(newFeedback));
  };
  const handleComment = (comment: string) => {
    const newFeedback = { ...feedback, comment };
    setFeedback(newFeedback);
    localStorage.setItem(feedbackKey, JSON.stringify(newFeedback));
  };
  return (
    <Group gap={4}>
      <ActionIcon variant={feedback.up ? 'filled' : 'light'} color="teal" onClick={() => handleFeedback('up')}><IconThumbUp size={16} /></ActionIcon>
      <Text size="xs">{feedback.up || 0}</Text>
      <ActionIcon variant={feedback.down ? 'filled' : 'light'} color="red" onClick={() => handleFeedback('down')}><IconThumbDown size={16} /></ActionIcon>
      <Text size="xs">{feedback.down || 0}</Text>
      <ActionIcon variant={feedback.comment ? 'filled' : 'light'} color="blue"><IconMessage size={16} /></ActionIcon>
      <TextInput
        placeholder="Leave a comment"
        value={feedback.comment || ''}
        onChange={e => handleComment(e.currentTarget.value)}
        size="xs"
        style={{ minWidth: 120 }}
      />
    </Group>
  );
}

function AIExplanation({ action }: { action: any }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleShow = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setExplanation(`This action was suggested because the AI detected a need for: ${action.action}. (Mock explanation)`);
      setLoading(false);
    }, 700);
  };
  return (
    <Group gap={4} mt={2}>
      <Button size="xs" variant="light" onClick={handleShow} loading={loading} disabled={!!explanation}>Show Explanation</Button>
      {explanation && <Text size="xs" color="dimmed">{explanation}</Text>}
    </Group>
  );
}

export default function OrchestratorLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [processingIdx, setProcessingIdx] = useState<{ logIdx: number; actionIdx: number } | null>(null);
  const [undoingIdx, setUndoingIdx] = useState<{ logIdx: number; actionIdx: number } | null>(null);

  const supportedUndoTypes = [
    'create_task', 'delete_task', 'create_document', 'delete_document',
    'create_expense', 'delete_expense', 'create_research', 'delete_research'
  ];

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

  const runOrchestrator = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/api/orchestrator/auto', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to run orchestrator');
      }
      await fetchLogs();
    } catch (err: any) {
      setRunError(err.message || 'Error running orchestrator');
    } finally {
      setRunning(false);
    }
  };

  const handleApprove = async (action: any, logIdx: number, actionIdx: number) => {
    setProcessingIdx({ logIdx, actionIdx });
    try {
      const res = await fetch('/api/orchestrator/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      await fetchLogs();
      if (data.status === 'approved') {
        showNotification({
          title: 'AI Action Approved',
          message: data.info,
          color: 'teal',
          icon: <IconCheck size={18} />,
        });
      } else if (data.status === 'error') {
        showNotification({
          title: 'AI Action Error',
          message: data.info,
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
    } catch (err) {
      showNotification({
        title: 'Approval Error',
        message: 'Failed to approve action',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setProcessingIdx(null);
    }
  };

  const handleReject = async (action: any, logIdx: number, actionIdx: number) => {
    setProcessingIdx({ logIdx, actionIdx });
    try {
      // Fetch logs, update the result to 'rejected', and POST back
      const res = await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs');
      const logs = await res.json();
      if (Array.isArray(logs) && logs[logIdx] && logs[logIdx].results && logs[logIdx].results[actionIdx]) {
        logs[logIdx].results[actionIdx] = { action, status: 'rejected', info: 'User rejected this action' };
        await fetch('http://localhost:3333/?mode=disk&key=orchestrator_logs', {
          method: 'POST',
          body: JSON.stringify(logs),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await fetchLogs();
      showNotification({
        title: 'AI Action Rejected',
        message: 'The action was rejected and will not be executed.',
        color: 'gray',
        icon: <IconX size={18} />,
      });
    } catch (err) {
      showNotification({
        title: 'Rejection Error',
        message: 'Failed to reject action',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setProcessingIdx(null);
    }
  };

  const handleUndo = async (action: any, logIdx: number, actionIdx: number) => {
    setUndoingIdx({ logIdx, actionIdx });
    try {
      const res = await fetch('/api/orchestrator/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      await fetchLogs();
      if (data.status === 'undone') {
        showNotification({
          title: 'AI Action Undone',
          message: data.info,
          color: 'yellow',
          icon: <IconHistory size={18} />,
        });
      } else if (data.status === 'error') {
        showNotification({
          title: 'Undo Error',
          message: data.info,
          color: 'red',
          icon: <IconX size={18} />,
        });
      }
    } catch (err) {
      showNotification({
        title: 'Undo Error',
        message: 'Failed to undo action',
        color: 'red',
        icon: <IconX size={18} />,
      });
    } finally {
      setUndoingIdx(null);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Optionally, poll every 30s
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtering logic
  const filteredLogs = logs.map((log) => {
    let filteredActions = log.actions || [];
    let filteredResults = log.results || [];
    if (actionType) {
      filteredActions = filteredActions.filter((a: any) => a.action === actionType);
      filteredResults = filteredResults.filter((r: any, i: number) => (log.actions[i]?.action === actionType));
    }
    if (status) {
      filteredResults = filteredResults.filter((r: any) => r.status === status);
      filteredActions = filteredActions.filter((a: any, i: number) => filteredResults[i]);
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filteredActions = filteredActions.filter((a: any) => JSON.stringify(a).toLowerCase().includes(s));
      filteredResults = filteredResults.filter((r: any) => JSON.stringify(r).toLowerCase().includes(s));
    }
    return { ...log, actions: filteredActions, results: filteredResults };
  });

  const actionTypeOptions = uniqueActionTypes(logs).map((type) => ({ value: type, label: type }));
  const statusOptions = uniqueStatuses(logs).map((s) => ({ value: s, label: s }));

  return (
    <Paper p="md" shadow="sm" withBorder>
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>AI Orchestrator Log</Title>
        <Group>
          <Button size="xs" onClick={fetchLogs} loading={loading}>Refresh</Button>
          <Button size="xs" color="teal" onClick={runOrchestrator} loading={running}>Run Orchestrator</Button>
        </Group>
      </Group>
      <Group mb="md" gap="xs">
        <Select
          placeholder="Action type"
          data={actionTypeOptions}
          value={actionType}
          onChange={setActionType}
          clearable
          searchable
          size="xs"
          style={{ minWidth: 120 }}
        />
        <Select
          placeholder="Status"
          data={statusOptions}
          value={status}
          onChange={setStatus}
          clearable
          searchable
          size="xs"
          style={{ minWidth: 100 }}
        />
        <TextInput
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          size="xs"
          style={{ minWidth: 180 }}
        />
        {(actionType || status || search) && (
          <Button size="xs" variant="light" color="gray" onClick={() => { setActionType(null); setStatus(null); setSearch(''); }}>Clear Filters</Button>
        )}
      </Group>
      {error && <Text color="red" mb="md">{error}</Text>}
      {runError && <Text color="red" mb="md">{runError}</Text>}
      {loading && <Loader />}
      <ScrollArea h={500}>
        <Stack>
          {filteredLogs.length === 0 && !loading && <Text color="dimmed">No orchestrator logs found.</Text>}
          {filteredLogs.map((log, logIdx) => (
            <Paper key={logIdx} p="sm" withBorder radius="md" mb="sm">
              <Text size="sm" color="dimmed">{new Date(log.timestamp).toLocaleString()}</Text>
              <Divider my="xs" />
              <Text fw={500} mb={4}>Actions:</Text>
              <Stack gap={2}>
                {log.actions && log.actions.map((action: any, actionIdx: number) => {
                  const feedbackKey = `orchestrator_feedback:${log.timestamp}:${actionIdx}`;
                  return (
                    <Group key={actionIdx} gap={8} align="center">
                      <Badge color="blue" size="sm">{action.action}</Badge>
                      <Text size="sm">{JSON.stringify(action)}</Text>
                      {log.results && log.results[actionIdx]?.status === 'suggested' && (
                        <Group gap={4}>
                          <Button
                            size="xs"
                            color="green"
                            leftSection={<IconCheck size={14} />}
                            loading={!!processingIdx && processingIdx.logIdx === logIdx && processingIdx.actionIdx === actionIdx}
                            onClick={() => handleApprove(action, logIdx, actionIdx)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            leftSection={<IconX size={14} />}
                            loading={!!processingIdx && processingIdx.logIdx === logIdx && processingIdx.actionIdx === actionIdx}
                            onClick={() => handleReject(action, logIdx, actionIdx)}
                          >
                            Reject
                          </Button>
                        </Group>
                      )}
                      {log.results &&
                        (log.results[actionIdx]?.status === 'approved' || log.results[actionIdx]?.status === 'success') &&
                        supportedUndoTypes.includes(action.action) && (
                          <Button
                            size="xs"
                            color="yellow"
                            leftSection={<IconHistory size={14} />}
                            loading={!!undoingIdx && undoingIdx.logIdx === logIdx && undoingIdx.actionIdx === actionIdx}
                            onClick={() => handleUndo(action, logIdx, actionIdx)}
                          >
                            Undo
                          </Button>
                        )}
                      <Feedback feedbackKey={feedbackKey} />
                      <AIExplanation action={action} />
                    </Group>
                  );
                })}
              </Stack>
              <Divider my="xs" />
              <Text fw={500} mb={4}>Results:</Text>
              <Stack gap={2}>
                {log.results && log.results.map((result: any, i: number) => (
                  <Group key={i} gap={8} align="center">
                    <Badge color={result.status === 'success' ? 'green' : result.status === 'error' ? 'red' : result.status === 'approved' ? 'teal' : result.status === 'rejected' ? 'gray' : 'gray'} size="sm">{result.status}</Badge>
                    <Text size="sm">{result.info}</Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
} 