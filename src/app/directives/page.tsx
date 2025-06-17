"use client";
import { Title, Text, Group, Button, Modal, TextInput, Select, Textarea, Stack, Table, Loader, Notification, Badge, MultiSelect, Divider, Collapse, Checkbox } from "@mantine/core";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useState } from 'react';

// Add types for Directive and TargetGroup
interface Directive {
  id: string;
  title: string;
  content_rows: string[];
  source_language: string;
  category: string;
  issuing_body: string;
  issue_date: string;
  keywords: string[];
  status: 'draft' | 'pending_approval' | 'published' | 'archived';
  created_by: string;
  created_at: string;
  last_updated_by: string;
  last_updated_at: string;
}
interface TargetGroup {
  id: string;
  name: string;
}

export default function DirectivesHubPage() {
  // User role (simulate from localStorage or prop)
  const [role, setRole] = useState('Broadcaster');
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editDirective, setEditDirective] = useState<Directive | null>(null);
  const [form, setForm] = useState<any>({ title: '', content_rows: [''], source_language: 'en', category: '', issuing_body: '', issue_date: '', keywords: [], status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [broadcastModal, setBroadcastModal] = useState<{ open: boolean; directive: Directive | null }>({ open: false, directive: null });
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastLogOpen, setBroadcastLogOpen] = useState(false);
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inbox, setInbox] = useState<any[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [broadcastLogsLoading, setBroadcastLogsLoading] = useState(false);
  const [viewedDirective, setViewedDirective] = useState<Directive | null>(null);

  // Fetch directives
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/directives?mine=1')
      .then(res => res.json())
      .then(data => setDirectives(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch target groups
  useEffect(() => {
    fetch('/api/target-groups')
      .then(res => res.json())
      .then(data => setTargetGroups(Array.isArray(data) ? data : []));
  }, []);

  // Fetch broadcast logs
  const fetchBroadcastLogs = () => {
    setBroadcastLogsLoading(true);
    fetch('/api/broadcast-logs')
      .then(res => res.json())
      .then(data => setBroadcastLogs(Array.isArray(data) ? data : []))
      .finally(() => setBroadcastLogsLoading(false));
  };

  // Fetch inbox
  const fetchInbox = () => {
    setInboxLoading(true);
    fetch('/api/directives-inbox')
      .then(res => res.json())
      .then(data => setInbox(Array.isArray(data) ? data : []))
      .finally(() => setInboxLoading(false));
  };

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }));
  };

  // Save directive (create or update)
  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editDirective ? 'PUT' : 'POST';
      const url = editDirective ? `/api/directives/${editDirective.id}` : '/api/directives';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save directive');
      setModalOpen(false);
      setEditDirective(null);
      setForm({ title: '', content_rows: [''], source_language: 'en', category: '', issuing_body: '', issue_date: '', keywords: [], status: 'draft' });
      // Refresh list
      const data = await fetch('/api/directives?mine=1').then(r => r.json());
      setDirectives(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const openEdit = (dir: Directive) => {
    setEditDirective(dir);
    setForm({ ...dir });
    setModalOpen(true);
  };

  // Open broadcast modal
  const openBroadcast = (dir: Directive) => {
    setBroadcastModal({ open: true, directive: dir });
    setSelectedGroups([]);
  };

  // Broadcast directive
  const handleBroadcast = async () => {
    if (!broadcastModal.directive) return;
    setBroadcasting(true);
    try {
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive_id: broadcastModal.directive.id, target_group_ids: selectedGroups }),
      });
      setBroadcastModal({ open: false, directive: null });
      fetchBroadcastLogs();
    } catch (e) {
      // Optionally show error
    } finally {
      setBroadcasting(false);
    }
  };

  // Render
  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={2}>Directives Hub</Title>
        {role === 'Broadcaster' && (
          <Button onClick={() => { setModalOpen(true); setEditDirective(null); }}>New Directive</Button>
        )}
      </Group>
      {error && <Notification color="red">{error}</Notification>}
      {loading ? <Loader /> : (
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Category</th>
              <th>Issuing Body</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {directives.map(dir => (
              <tr key={dir.id}>
                <td style={{ cursor: 'pointer' }} onClick={() => setViewedDirective(dir)}>{dir.title}</td>
                <td><Badge color={dir.status === 'published' ? 'green' : dir.status === 'draft' ? 'gray' : 'blue'}>{dir.status}</Badge></td>
                <td>{dir.category}</td>
                <td>{dir.issuing_body}</td>
                <td>{dir.issue_date ? new Date(dir.issue_date).toLocaleDateString() : ''}</td>
                <td>
                  {role === 'Broadcaster' && (
                    <Group gap={4}>
                      <Button size="xs" onClick={() => openEdit(dir)}>Edit</Button>
                      <Button size="xs" onClick={() => openBroadcast(dir)} disabled={dir.status !== 'published'}>Broadcast</Button>
                    </Group>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Group gap={8} mt="md">
        <Button variant="light" onClick={() => { setInboxOpen(o => !o); if (!inboxOpen) fetchInbox(); }}>Received Directives</Button>
        <Button variant="light" onClick={() => { setBroadcastLogOpen(o => !o); if (!broadcastLogOpen) fetchBroadcastLogs(); }}>Broadcast Logs</Button>
      </Group>
      <Collapse in={inboxOpen} mt="md">
        <Title order={4} mb="sm">Received Directives</Title>
        {inboxLoading ? <Loader /> : inbox.length === 0 ? <Text color="dimmed">No directives received.</Text> : (
          <Table striped highlightOnHover withTableBorder>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Issuing Body</th>
                <th>Date</th>
                <th>Read</th>
              </tr>
            </thead>
            <tbody>
              {inbox.map((d: any) => (
                <tr key={d.id} onClick={() => setViewedDirective(d.directive)} style={{ cursor: 'pointer' }}>
                  <td>{d.directive?.title}</td>
                  <td>{d.directive?.status}</td>
                  <td>{d.directive?.issuing_body}</td>
                  <td>{d.directive?.issue_date ? new Date(d.directive.issue_date).toLocaleDateString() : ''}</td>
                  <td>{d.read_status ? <Badge color="gray">Read</Badge> : <Badge color="blue">Unread</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Collapse>
      <Collapse in={broadcastLogOpen} mt="md">
        <Title order={4} mb="sm">Broadcast Logs</Title>
        {broadcastLogsLoading ? <Loader /> : broadcastLogs.length === 0 ? <Text color="dimmed">No broadcasts yet.</Text> : (
          <Table striped highlightOnHover withTableBorder>
            <thead>
              <tr>
                <th>Directive</th>
                <th>Target Groups</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {broadcastLogs.map((log: any) => (
                <tr key={log.id}>
                  <td>{log.directive_title}</td>
                  <td>{(log.target_groups || []).join(', ')}</td>
                  <td>{log.date ? new Date(log.date).toLocaleDateString() : ''}</td>
                  <td>{log.status}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Collapse>
      {/* Directive Details Modal */}
      <Modal opened={!!viewedDirective} onClose={() => setViewedDirective(null)} title={viewedDirective?.title || 'Directive Details'} size="lg" centered>
        {viewedDirective && (
          <Stack>
            <Group gap={8}>
              <Badge>{viewedDirective.status}</Badge>
              <Badge>{viewedDirective.category}</Badge>
              <Badge>{viewedDirective.issuing_body}</Badge>
              <Badge>{viewedDirective.source_language}</Badge>
              <Badge>{viewedDirective.issue_date ? new Date(viewedDirective.issue_date).toLocaleDateString() : ''}</Badge>
            </Group>
            <Divider my="sm" />
            <Title order={5}>Content</Title>
            {Array.isArray(viewedDirective.content_rows) ? (
              viewedDirective.content_rows.map((row, idx) => (
                <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>{row}</ReactMarkdown>
              ))
            ) : (
              <Text color="dimmed">No content.</Text>
            )}
            <Divider my="sm" />
            <Text size="sm" color="dimmed">Keywords: {viewedDirective.keywords?.join(', ')}</Text>
          </Stack>
        )}
      </Modal>
      {/* Create/Edit Directive Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editDirective ? 'Edit Directive' : 'New Directive'} size="lg" centered>
        <Stack>
          <TextInput label="Title" value={form.title} onChange={e => handleFormChange('title', e.currentTarget.value)} required />
          <Textarea label="Content (Markdown, one row per line)" minRows={4} value={form.content_rows?.join('\n') || ''} onChange={e => handleFormChange('content_rows', e.currentTarget.value.split('\n'))} required />
          <Select label="Source Language" data={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'French' }, { value: 'sw', label: 'Swahili' }, { value: 'ar', label: 'Arabic' }]} value={form.source_language} onChange={v => handleFormChange('source_language', v)} required />
          <TextInput label="Category" value={form.category} onChange={e => handleFormChange('category', e.currentTarget.value)} required />
          <TextInput label="Issuing Body" value={form.issuing_body} onChange={e => handleFormChange('issuing_body', e.currentTarget.value)} required />
          <TextInput label="Date of Issue" type="date" value={form.issue_date} onChange={e => handleFormChange('issue_date', e.currentTarget.value)} required />
          <MultiSelect label="Keywords/Tags" data={[]} value={form.keywords} onChange={v => handleFormChange('keywords', v)} searchable creatable />
          <Select label="Status" data={[{ value: 'draft', label: 'Draft' }, { value: 'pending_approval', label: 'Pending Approval' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }]} value={form.status} onChange={v => handleFormChange('status', v)} required />
          <Group gap={8} mt="md">
            <Button loading={saving} onClick={handleSave}>{editDirective ? 'Save Changes' : 'Create Directive'}</Button>
            <Button variant="light" onClick={() => setModalOpen(false)}>Cancel</Button>
          </Group>
        </Stack>
      </Modal>
      {/* Broadcast Modal */}
      <Modal opened={broadcastModal.open} onClose={() => setBroadcastModal({ open: false, directive: null })} title="Broadcast Directive" centered>
        <Stack>
          <Text>Select target groups to broadcast to:</Text>
          <MultiSelect data={targetGroups.map(g => ({ value: g.id, label: g.name }))} value={selectedGroups} onChange={setSelectedGroups} searchable />
          <Button loading={broadcasting} onClick={handleBroadcast} disabled={selectedGroups.length === 0}>Broadcast</Button>
        </Stack>
      </Modal>
    </Stack>
  );
} 