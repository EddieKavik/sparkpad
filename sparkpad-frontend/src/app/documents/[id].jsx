import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea, Container, Title, Button, Group, Select, Modal, Text } from '@mantine/core';
import io from 'socket.io-client';

let socket;

export default function DocumentPage({ params }) {
  const documentId = params?.id || '';
  const [content, setContent] = useState('');
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  const [doc, setDoc] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('');
  const [version, setVersion] = useState(1);
  const [reviewer, setReviewer] = useState('');
  const [owner, setOwner] = useState('');
  const [users, setUsers] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [compareModal, setCompareModal] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [diff, setDiff] = useState(null);
  const textareaRef = useRef();

  // Fetch user list
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(u => setUsers(u.map(user => ({ value: user.email || user.id, label: user.email || user.id }))));
  }, []);

  // Fetch document info
  useEffect(() => {
    if (!documentId) return;
    fetch(`/api/documents/${documentId}`)
      .then(res => res.json())
      .then(d => {
        setDoc(d);
        setContent(d.content);
        setStatus(d.status);
        setVersion(d.version);
        setReviewer(d.reviewer);
        setOwner(d.owner);
      });
    fetch(`/api/documents/${documentId}/history`)
      .then(res => res.json())
      .then(h => setHistory(h));
  }, [documentId]);

  // Real-time sync (optional, keep for now)
  useEffect(() => {
    if (!documentId) return;
    socket = io('http://localhost:4000');
    socket.emit('document:join', { documentId });
    socket.on('document:update', ({ content: newContent }) => {
      if (newContent !== textareaRef.current.value) {
        setIsRemoteUpdate(true);
        setContent(newContent);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [documentId]);

  // Save draft
  const handleSaveDraft = async () => {
    await fetch(`/api/documents/${documentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, editor: owner }),
    });
    window.location.reload();
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit_for_approval', reviewer }),
    });
    window.location.reload();
  };

  // Approve
  const handleApprove = async () => {
    await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', reviewer }),
    });
    window.location.reload();
  };

  // Reject
  const handleReject = async () => {
    await fetch(`/api/documents/${documentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reviewer }),
    });
    window.location.reload();
  };

  // Compare versions
  const handleCompare = async () => {
    if (!compareA || !compareB) return;
    const res = await fetch(`/api/documents/${documentId}/compare?versionA=${compareA}&versionB=${compareB}`);
    const data = await res.json();
    setDiff(data.diff);
    setCompareModal(true);
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2}>Document: {documentId}</Title>
      <Text>Status: {status} | Version: {version}</Text>
      {(status === 'draft' || !documentId) && (
        <Group mb="md">
          <Select
            label="Owner"
            data={users}
            value={owner}
            onChange={setOwner}
            placeholder="Select owner"
            searchable
          />
          <Select
            label="Reviewer"
            data={users}
            value={reviewer}
            onChange={setReviewer}
            placeholder="Select reviewer"
            searchable
          />
        </Group>
      )}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        minRows={15}
        autosize
        mt="md"
        placeholder="Start typing..."
        styles={{ input: { fontFamily: 'monospace', fontSize: 16 } }}
        disabled={status === 'pending_approval' || status === 'approved'}
      />
      <Group mt="md">
        <Button onClick={handleSaveDraft} disabled={status === 'pending_approval' || status === 'approved'}>Save Draft</Button>
        <Button onClick={handleSubmitForApproval} disabled={status !== 'draft'}>Submit for Approval</Button>
        <Button onClick={handleApprove} disabled={status !== 'pending_approval'}>Approve</Button>
        <Button onClick={handleReject} disabled={status !== 'pending_approval'} color="red">Reject</Button>
        <Button onClick={() => setShowHistory(true)}>Version History</Button>
      </Group>
      <Modal opened={showHistory} onClose={() => setShowHistory(false)} title="Version History" size="lg">
        {history && history.length > 0 ? (
          <>
            <ul>
              {history.map((v) => (
                <li key={v.version}>
                  Version {v.version} ({v.status}) - {v.timestamp}
                </li>
              ))}
            </ul>
            <Group mt="md">
              <Select
                label="Compare A"
                data={history.map((v) => ({ value: v.version.toString(), label: `v${v.version}` }))}
                value={compareA}
                onChange={setCompareA}
              />
              <Select
                label="Compare B"
                data={history.map((v) => ({ value: v.version.toString(), label: `v${v.version}` }))}
                value={compareB}
                onChange={setCompareB}
              />
              <Button onClick={handleCompare} disabled={!compareA || !compareB}>Compare</Button>
            </Group>
          </>
        ) : (
          <Text>No history available.</Text>
        )}
      </Modal>
      <Modal opened={compareModal} onClose={() => setCompareModal(false)} title="Version Diff" size="lg">
        {diff ? (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {diff.map((part, idx) => (
              <span
                key={idx}
                style={{ background: part.added ? '#d4fcdc' : part.removed ? '#ffd6d6' : 'none' }}
              >
                {part.value}
              </span>
            ))}
          </pre>
        ) : (
          <Text>No diff available.</Text>
        )}
      </Modal>
    </Container>
  );
} 