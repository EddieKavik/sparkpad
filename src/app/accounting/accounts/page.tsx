"use client";
import { Title, Container, Table, Button, Group, Stack, Text, Paper } from "@mantine/core";
import { IconPlus, IconSparkles } from "@tabler/icons-react";

export default function AccountsPage() {
  // Placeholder data
  const accounts = [
    { name: "Cash", type: "Asset", balance: 12000 },
    { name: "Accounts Receivable", type: "Asset", balance: 5000 },
    { name: "Sales Revenue", type: "Income", balance: 20000 },
    { name: "Office Supplies", type: "Expense", balance: 800 },
  ];
  return (
    <Container size="md" py="xl">
      <Title order={3} mb="md">Chart of Accounts</Title>
      <Paper p="md" mb="md" withBorder>
        <Group justify="space-between">
          <Text fw={700}>Accounts</Text>
          <Button leftSection={<IconPlus size={16} />}>Add Account</Button>
        </Group>
        <Table mt="md" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Account Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Balance</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {accounts.map((acc) => (
              <Table.Tr key={acc.name}>
                <Table.Td>{acc.name}</Table.Td>
                <Table.Td>{acc.type}</Table.Td>
                <Table.Td>${acc.balance.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
      <Paper p="md" withBorder>
        <Group>
          <IconSparkles size={20} />
          <Text>AI can suggest an optimal account structure for your business.</Text>
        </Group>
      </Paper>
    </Container>
  );
} 