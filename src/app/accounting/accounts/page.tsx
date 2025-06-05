"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Button, Table, Text, Group, Modal, TextInput, Select, ActionIcon, Stack } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

interface Account {
  id: string;
  name: string;
  type: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('Asset');

  useEffect(() => {
    const fetchAccounts = async () => {
      const userEmail = localStorage.getItem('user:username');
      if (!userEmail) return;
      const res = await fetch(`http://localhost:3333/accounting/accounts?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    };
    fetchAccounts();
  }, []);

  const saveAccounts = async (updated: Account[]) => {
    const userEmail = localStorage.getItem('user:username');
    if (!userEmail) return;
    await fetch(`http://localhost:3333/accounting/accounts?mode=disk&key=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      body: JSON.stringify(updated),
    });
    setAccounts(updated);
  };

  const handleAdd = () => {
    setEditAccount(null);
    setName('');
    setType('Asset');
    setModalOpen(true);
  };

  const handleEdit = (acc: Account) => {
    setEditAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setModalOpen(true);
  };

  const handleDelete = async (acc: Account) => {
    const updated = accounts.filter(a => a !== acc);
    await saveAccounts(updated);
  };

  const handleSave = async () => {
    let updated: Account[];
    if (editAccount) {
      updated = accounts.map(a => a === editAccount ? { ...a, name, type } : a);
    } else {
      updated = [...accounts, { name, type, id: Date.now().toString() }];
    }
    await saveAccounts(updated);
    setModalOpen(false);
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">Chart of Accounts</Title>
      <Button leftSection={<IconPlus size={16} />} onClick={handleAdd} mb="md">Add Account</Button>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {accounts.map((acc: Account) => (
            <Table.Tr key={acc.id}>
              <Table.Td>{acc.name}</Table.Td>
              <Table.Td>{acc.type}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon color="blue" onClick={() => handleEdit(acc)}><IconEdit size={16} /></ActionIcon>
                  <ActionIcon color="red" onClick={() => handleDelete(acc)}><IconTrash size={16} /></ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editAccount ? 'Edit Account' : 'Add Account'}>
        <Stack>
          <TextInput label="Account Name" value={name} onChange={e => setName(e.currentTarget.value)} required />
          <Select
            label="Type"
            data={ACCOUNT_TYPES}
            value={type}
            onChange={(value) => setType(value || "")}
            required
            mb="sm"
          />
          <Button onClick={handleSave}>{editAccount ? 'Save Changes' : 'Add Account'}</Button>
        </Stack>
      </Modal>
    </Container>
  );
} 