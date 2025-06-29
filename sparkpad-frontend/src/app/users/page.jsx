import { useEffect, useState } from 'react';
import { Container, Title, Table, Button, Group, TextInput, Select, Modal, Text } from '@mantine/core';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'admin', label: 'Admin' },
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers);
  }, [adding]);

  const handleAdd = async () => {
    setAdding(true);
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role }),
    });
    setAdding(false);
    setShowAdd(false);
    setEmail('');
    setName('');
    setRole('');
  };

  return (
    <Container size="md" py="xl">
      <Title order={2}>Users</Title>
      <Group mb="md">
        <Button onClick={() => setShowAdd(true)}>Add User</Button>
      </Group>
      <Table striped highlightOnHover>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.name}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal opened={showAdd} onClose={() => setShowAdd(false)} title="Add User" size="md">
        <TextInput
          label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter email"
          mb="md"
        />
        <TextInput
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter name"
          mb="md"
        />
        <Select
          label="Role"
          data={roleOptions}
          value={role}
          onChange={setRole}
          placeholder="Select role"
          searchable
          mb="md"
        />
        <Group mt="md">
          <Button onClick={handleAdd} loading={adding} disabled={!email || !name || !role}>
            Add
          </Button>
          <Button variant="outline" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </Container>
  );
} 