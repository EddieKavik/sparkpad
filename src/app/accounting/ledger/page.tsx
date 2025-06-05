"use client";
import { useMemo } from "react";
import { Container, Title, Table, Group, Text, Paper } from "@mantine/core";

// Mock data for demonstration
const accounts = [
  { id: "1", name: "Cash", type: "Asset" },
  { id: "2", name: "Revenue", type: "Income" },
];

const transactions = [
  { id: "t1", accountId: "1", date: "2024-06-01", description: "Opening Balance", debit: 1000, credit: 0 },
  { id: "t2", accountId: "1", date: "2024-06-02", description: "Sale", debit: 0, credit: 200 },
  { id: "t3", accountId: "2", date: "2024-06-02", description: "Sale", debit: 200, credit: 0 },
  { id: "t4", accountId: "1", date: "2024-06-03", description: "Purchase", debit: 0, credit: 100 },
];

function getAccountTransactions(accountId: string) {
  return transactions
    .filter((tx) => tx.accountId === accountId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function calculateRunningBalances(accountId: string) {
  const txs = getAccountTransactions(accountId);
  let balance = 0;
  return txs.map((tx) => {
    balance += tx.debit - tx.credit;
    return { ...tx, balance };
  });
}

export default function GeneralLedgerPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">General Ledger</Title>
      <Group direction="column" gap="xl">
        {accounts.map((account) => {
          const ledger = calculateRunningBalances(account.id);
          return (
            <Paper key={account.id} withBorder p="md" radius="md" shadow="sm">
              <Title order={4} mb="sm">{account.name} ({account.type})</Title>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Debit</Table.Th>
                    <Table.Th>Credit</Table.Th>
                    <Table.Th>Balance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {ledger.map((tx) => (
                    <Table.Tr key={tx.id}>
                      <Table.Td>{tx.date}</Table.Td>
                      <Table.Td>{tx.description}</Table.Td>
                      <Table.Td>{tx.debit ? tx.debit.toFixed(2) : ""}</Table.Td>
                      <Table.Td>{tx.credit ? tx.credit.toFixed(2) : ""}</Table.Td>
                      <Table.Td>{tx.balance.toFixed(2)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          );
        })}
      </Group>
    </Container>
  );
} 