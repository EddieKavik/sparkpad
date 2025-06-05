"use client";
import { useState } from "react";
import { Title, Container, Button, Group, Stack, Text, Paper, TextInput, Table, Divider } from "@mantine/core";
import { IconChartBar, IconSparkles } from "@tabler/icons-react";

// Mock data for demonstration
const accounts = [
  { id: "1", name: "Cash", type: "Asset" },
  { id: "2", name: "Accounts Receivable", type: "Asset" },
  { id: "3", name: "Accounts Payable", type: "Liability" },
  { id: "4", name: "Revenue", type: "Income" },
  { id: "5", name: "Expenses", type: "Expense" },
  { id: "6", name: "Equity", type: "Equity" },
];
const transactions = [
  { id: "t1", accountId: "1", date: "2024-06-01", description: "Opening Balance", debit: 1000, credit: 0 },
  { id: "t2", accountId: "2", date: "2024-06-02", description: "Invoice", debit: 500, credit: 0 },
  { id: "t3", accountId: "3", date: "2024-06-03", description: "Bill", debit: 0, credit: 200 },
  { id: "t4", accountId: "4", date: "2024-06-04", description: "Sale", debit: 0, credit: 800 },
  { id: "t5", accountId: "5", date: "2024-06-05", description: "Office Supplies", debit: 300, credit: 0 },
  { id: "t6", accountId: "6", date: "2024-06-06", description: "Owner Investment", debit: 0, credit: 1000 },
];

function sumByAccountType(type: string) {
  return accounts
    .filter((a) => a.type === type)
    .map((a) => {
      const txs = transactions.filter((t) => t.accountId === a.id);
      const balance = txs.reduce((sum, t) => sum + t.debit - t.credit, 0);
      return { ...a, balance };
    });
}

function BalanceSheet() {
  const assets = sumByAccountType("Asset");
  const liabilities = sumByAccountType("Liability");
  const equity = sumByAccountType("Equity");
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="sm">Balance Sheet</Title>
      <Group align="flex-start" grow>
        <Stack>
          <Text fw={700}>Assets</Text>
          <Table>
            <Table.Tbody>
              {assets.map((a) => (
                <Table.Tr key={a.id}><Table.Td>{a.name}</Table.Td><Table.Td ta="right">{a.balance.toFixed(2)}</Table.Td></Table.Tr>
              ))}
              <Table.Tr><Table.Td fw={700}>Total Assets</Table.Td><Table.Td ta="right" fw={700}>{totalAssets.toFixed(2)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
        <Stack>
          <Text fw={700}>Liabilities</Text>
          <Table>
            <Table.Tbody>
              {liabilities.map((a) => (
                <Table.Tr key={a.id}><Table.Td>{a.name}</Table.Td><Table.Td ta="right">{a.balance.toFixed(2)}</Table.Td></Table.Tr>
              ))}
              <Table.Tr><Table.Td fw={700}>Total Liabilities</Table.Td><Table.Td ta="right" fw={700}>{totalLiabilities.toFixed(2)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
        <Stack>
          <Text fw={700}>Equity</Text>
          <Table>
            <Table.Tbody>
              {equity.map((a) => (
                <Table.Tr key={a.id}><Table.Td>{a.name}</Table.Td><Table.Td ta="right">{a.balance.toFixed(2)}</Table.Td></Table.Tr>
              ))}
              <Table.Tr><Table.Td fw={700}>Total Equity</Table.Td><Table.Td ta="right" fw={700}>{totalEquity.toFixed(2)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </Stack>
      </Group>
      <Divider my="md" />
      <Text fw={700}>Assets = Liabilities + Equity: {totalAssets.toFixed(2)} = {totalLiabilities.toFixed(2)} + {totalEquity.toFixed(2)}</Text>
    </Paper>
  );
}

function IncomeStatement() {
  const income = sumByAccountType("Income");
  const expenses = sumByAccountType("Expense");
  const totalIncome = income.reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
  const netIncome = totalIncome - totalExpenses;
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="sm">Income Statement</Title>
      <Stack>
        <Text fw={700}>Income</Text>
        <Table>
          <Table.Tbody>
            {income.map((a) => (
              <Table.Tr key={a.id}><Table.Td>{a.name}</Table.Td><Table.Td ta="right">{a.balance.toFixed(2)}</Table.Td></Table.Tr>
            ))}
            <Table.Tr><Table.Td fw={700}>Total Income</Table.Td><Table.Td ta="right" fw={700}>{totalIncome.toFixed(2)}</Table.Td></Table.Tr>
          </Table.Tbody>
        </Table>
        <Text fw={700} mt="md">Expenses</Text>
        <Table>
          <Table.Tbody>
            {expenses.map((a) => (
              <Table.Tr key={a.id}><Table.Td>{a.name}</Table.Td><Table.Td ta="right">{a.balance.toFixed(2)}</Table.Td></Table.Tr>
            ))}
            <Table.Tr><Table.Td fw={700}>Total Expenses</Table.Td><Table.Td ta="right" fw={700}>{totalExpenses.toFixed(2)}</Table.Td></Table.Tr>
          </Table.Tbody>
        </Table>
        <Divider my="sm" />
        <Text fw={700}>Net Income: {netIncome.toFixed(2)}</Text>
      </Stack>
    </Paper>
  );
}

function CashFlowStatement() {
  // For demo, just sum all debits and credits
  const cashIn = transactions.filter(t => t.debit > 0).reduce((sum, t) => sum + t.debit, 0);
  const cashOut = transactions.filter(t => t.credit > 0).reduce((sum, t) => sum + t.credit, 0);
  const netCash = cashIn - cashOut;
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="sm">Cash Flow Statement</Title>
      <Stack>
        <Group justify="space-between"><Text>Cash Inflows</Text><Text>{cashIn.toFixed(2)}</Text></Group>
        <Group justify="space-between"><Text>Cash Outflows</Text><Text>{cashOut.toFixed(2)}</Text></Group>
        <Divider my="sm" />
        <Text fw={700}>Net Cash Flow: {netCash.toFixed(2)}</Text>
      </Stack>
    </Paper>
  );
}

export default function ReportsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Container size="md" py="xl">
      <Title order={3} mb="md">Financial Reports</Title>
      <Paper p="md" mb="md" withBorder>
        <Group gap="md">
          <Button leftSection={<IconChartBar size={16} />} variant={selected === "balance" ? "filled" : "light"} onClick={() => setSelected("balance")}>Balance Sheet</Button>
          <Button leftSection={<IconChartBar size={16} />} variant={selected === "income" ? "filled" : "light"} onClick={() => setSelected("income")}>Income Statement</Button>
          <Button leftSection={<IconChartBar size={16} />} variant={selected === "cash" ? "filled" : "light"} onClick={() => setSelected("cash")}>Cash Flow</Button>
        </Group>
      </Paper>
      {selected === "balance" && <BalanceSheet />}
      {selected === "income" && <IncomeStatement />}
      {selected === "cash" && <CashFlowStatement />}
      <Paper p="md" withBorder mt="xl">
        <Group align="flex-start">
          <IconSparkles size={20} />
          <Stack gap={2}>
            <Text>Ask AI about your finances:</Text>
            <TextInput placeholder="E.g. Show me all expenses over $500 last month" />
          </Stack>
        </Group>
      </Paper>
    </Container>
  );
} 