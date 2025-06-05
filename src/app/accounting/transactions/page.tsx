"use client";
import { Title, Container, Table, Button, Group, Stack, Text, Paper, Modal, TextInput, Select, ActionIcon } from "@mantine/core";
import { IconPlus, IconSparkles, IconTrash, IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from 'react';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ debit: string; credit: string } | null>(null);
  const [autoCategorizing, setAutoCategorizing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const userEmail = localStorage.getItem('user:username');
      if (!userEmail) return;
      const accRes = await fetch(`http://localhost:3333/accounting/accounts?mode=disk&key=${encodeURIComponent(userEmail)}`);
      const txRes = await fetch(`http://localhost:3333/accounting/transactions?mode=disk&key=${encodeURIComponent(userEmail)}`);
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(Array.isArray(accData) ? accData : []);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(Array.isArray(txData) ? txData : []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const saveTransactions = async (updated: Transaction[]) => {
    const userEmail = localStorage.getItem('user:username');
    if (!userEmail) return;
    await fetch(`http://localhost:3333/accounting/transactions?mode=disk&key=${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      body: JSON.stringify(updated),
    });
    setTransactions(updated);
  };

  const handleAdd = () => {
    setDebit('');
    setCredit('');
    setAmount('');
    setDate('');
    setDescription('');
    setModalOpen(true);
  };

  const handleSave = async (desc: Transaction) => {
    if (!debit || !credit || !amount || !date) return;
    const newTx: Transaction = {
      id: Date.now().toString(),
      debitAccount: debit,
      creditAccount: credit,
      amount: parseFloat(amount),
      date,
      description,
    };
    const updated = [...transactions, newTx];
    await saveTransactions(updated);
    setModalOpen(false);
  };

  const handleDelete = async (tx: Transaction) => {
    const updated = transactions.filter(t => t !== tx);
    await saveTransactions(updated);
  };

  // Mock AI suggestion based on description
  const aiSuggestAccount = (desc: string): { debit: string; credit: string } => {
    const lower = desc.toLowerCase();
    if (lower.includes('sale')) return { debit: accounts.find(a => a.type === 'Asset')?.id || '', credit: accounts.find(a => a.type === 'Income')?.id || '' };
    if (lower.includes('bill')) return { debit: accounts.find(a => a.type === 'Expense')?.id || '', credit: accounts.find(a => a.type === 'Liability')?.id || '' };
    if (lower.includes('investment')) return { debit: accounts.find(a => a.type === 'Asset')?.id || '', credit: accounts.find(a => a.type === 'Equity')?.id || '' };
    return { debit: '', credit: '' };
  };

  // Mock anomaly detection: missing accounts, negative/zero amount, or same account for debit/credit
  const isAnomalous = (tx: Transaction): boolean => {
    return !tx.debitAccount || !tx.creditAccount || tx.amount <= 0 || tx.debitAccount === tx.creditAccount;
  };

  // Auto-categorize all uncategorized/anomalous transactions
  const handleAutoCategorize = async () => {
    setAutoCategorizing(true);
    const updated = transactions.map((tx: Transaction) => {
      if (isAnomalous(tx)) {
        const suggestion = aiSuggestAccount(tx.description || '');
        return {
          ...tx,
          debitAccount: tx.debitAccount || suggestion.debit,
          creditAccount: tx.creditAccount || suggestion.credit,
          amount: tx.amount <= 0 ? 1 : tx.amount,
        };
      }
      return tx;
    });
    await saveTransactions(updated);
    setAutoCategorizing(false);
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="lg">Transactions</Title>
      <Group mb="md">
        <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>Add Transaction</Button>
        <Button leftSection={<IconSparkles size={16} />} variant="light" onClick={handleAutoCategorize} loading={autoCategorizing}>Auto-categorize All</Button>
      </Group>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Debit</Table.Th>
            <Table.Th>Credit</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {transactions.map((tx: Transaction) => {
            const anomalous = isAnomalous(tx);
            return (
              <Table.Tr key={tx.id} style={anomalous ? { background: '#fffbe6' } : {}}>
                <Table.Td>{tx.date}</Table.Td>
                <Table.Td>{tx.description}</Table.Td>
                <Table.Td>{accounts.find(a => a.id === tx.debitAccount)?.name || tx.debitAccount}</Table.Td>
                <Table.Td>{accounts.find(a => a.id === tx.creditAccount)?.name || tx.creditAccount}</Table.Td>
                <Table.Td>{tx.amount.toFixed(2)}</Table.Td>
                <Table.Td>
                  {anomalous ? (
                    <Group gap={4}><IconAlertTriangle size={16} color="orange" /><Text size="xs" c="orange">Anomaly</Text></Group>
                  ) : (
                    <Group gap={4}><IconCheck size={16} color="green" /><Text size="xs" c="green">OK</Text></Group>
                  )}
                </Table.Td>
                <Table.Td>
                  <ActionIcon color="red" onClick={() => handleDelete(tx)}><IconTrash size={16} /></ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Modal opened={modalOpen} onClose={() => { setModalOpen(false); setAiSuggestion(null); }} title="Add Transaction">
        <Stack>
          <TextInput label="Date" type="date" value={date} onChange={e => setDate(e.currentTarget.value)} required />
          <TextInput label="Description" value={description} onChange={e => setDescription(e.currentTarget.value)} />
          <Button leftSection={<IconSparkles size={16} />} variant="light" onClick={() => setAiSuggestion(aiSuggestAccount(description))} mb={4}>Suggest Accounts</Button>
          {aiSuggestion && (aiSuggestion.debit || aiSuggestion.credit) && (
            <Group gap={8} mb={4}>
              <Text size="sm">Suggested:</Text>
              {aiSuggestion.debit && <Button size="xs" variant="outline" onClick={() => setDebit(aiSuggestion.debit)}>Debit: {accounts.find(a => a.id === aiSuggestion.debit)?.name || aiSuggestion.debit}</Button>}
              {aiSuggestion.credit && <Button size="xs" variant="outline" onClick={() => setCredit(aiSuggestion.credit)}>Credit: {accounts.find(a => a.id === aiSuggestion.credit)?.name || aiSuggestion.credit}</Button>}
            </Group>
          )}
          <Select label="Debit Account" data={accounts.map(a => ({ value: a.id, label: a.name }))} value={debit} onChange={(value) => setDebit(value || "")} required />
          <Select label="Credit Account" data={accounts.map(a => ({ value: a.id, label: a.name }))} value={credit} onChange={(value) => setCredit(value || "")} required />
          <TextInput label="Amount" type="number" value={amount} onChange={e => setAmount(e.currentTarget.value)} required />
          <Button onClick={() => handleSave({ id: '', date, description, debitAccount: debit, creditAccount: credit, amount: parseFloat(amount) })}>Add Transaction</Button>
        </Stack>
      </Modal>
      <Paper p="md" mt="md">
        <Group>
          <IconSparkles size={20} />
          <Text>AI will soon auto-categorize transactions and flag anomalies.</Text>
        </Group>
      </Paper>
    </Container>
  );
} 