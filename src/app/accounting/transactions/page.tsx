"use client";
import { Title, Container, Table, Button, Group, Stack, Text, Paper } from "@mantine/core";
import { IconPlus, IconSparkles } from "@tabler/icons-react";

export default function TransactionsPage() {
  // Placeholder data
  const transactions = [
    { date: "2024-06-01", description: "Office Rent", account: "Office Supplies", amount: -1200 },
    { date: "2024-06-02", description: "Client Payment", account: "Sales Revenue", amount: 5000 },
    { date: "2024-06-03", description: "Purchase Laptop", account: "Office Supplies", amount: -900 },
  ];
  return (
    <Container size="md" py="xl">
      <Title order={3} mb="md">Transactions</Title>
      <Paper p="md" mb="md" withBorder>
        <Group justify="space-between">
          <Text fw={700}>All Transactions</Text>
          <Button leftSection={<IconPlus size={16} />}>Add Transaction</Button>
        </Group>
        <Table mt="md" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Account</Table.Th>
              <Table.Th>Amount</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {transactions.map((tx, i) => (
              <Table.Tr key={i}>
                <Table.Td>{tx.date}</Table.Td>
                <Table.Td>{tx.description}</Table.Td>
                <Table.Td>{tx.account}</Table.Td>
                <Table.Td style={{ color: tx.amount < 0 ? 'red' : 'green' }}>{tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <Paper p="md" withBorder>
        <Group>
          <IconSparkles size={20} />
          <Text>AI will soon auto-categorize transactions and flag anomalies.</Text>
        </Group>
      </Paper>
    </Container>
  );
} 