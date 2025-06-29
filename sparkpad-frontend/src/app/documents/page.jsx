import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Container, Title, Group, Select, Modal, Text, TextInput } from '@mantine/core';

export default function DocumentsDashboard() {
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newOwner, setNewOwner] = useState('');
  const [newReviewer, setNewReviewer] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(setDocuments);
    fetch('/api/users')
      .then(res => res.json())
      .then(u => setUsers(u.map(user => ({ value: user.email || user.id, label: user.email || user.id }))));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, owner: newOwner, reviewer: newReviewer }),
    });
    const doc = await res.json();
    setCreating(false);
    setShowCreate(false);
    router.push(`/documents/${doc.id}`);
  };

  return (
    <Container size="md" py="xl">
      <Title order={2}>Documents Dashboard</Title>
      <Group mb="md">
        <Button onClick={() => setShowCreate(true)}>Create New Document</Button>
      </Group>
      <Table striped highlightOnHover withBorder withColumnBorders>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Version</th>
            <th>Owner</th>
            <th>Reviewer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td>{doc.id}</td>
              <td>{doc.status}</td>
              <td>{doc.version}</td>
              <td>{doc.owner}</td>
              <td>{doc.reviewer}</td>
              <td>
                <Button size="xs" onClick={() => router.push(`/documents/${doc.id}`)}>
                  Open
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal opened={showCreate} onClose={() => setShowCreate(false)} title="Create New Document" size="md">
        <TextInput
          label="Initial Content"
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="Enter document content..."
          mb="md"
        />
        <Select
          label="Owner"
          data={users}
          value={newOwner}
          onChange={setNewOwner}
          placeholder="Select owner"
          searchable
          mb="md"
        />
        <Select
          label="Reviewer"
          data={users}
          value={newReviewer}
          onChange={setNewReviewer}
          placeholder="Select reviewer"
          searchable
          mb="md"
        />
        <Group mt="md">
          <Button onClick={handleCreate} loading={creating} disabled={!newOwner || !newReviewer}>
            Create
          </Button>
          <Button variant="outline" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </Container>
  );
} 