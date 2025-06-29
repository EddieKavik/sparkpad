'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  MultiSelect,
  SimpleGrid,
  Card,
  Badge,
  Textarea,
  Loader,
  useMantineTheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';

// Mock user data - replace with actual API call to /api/users
const mockUsers = [
  { value: 'user1@example.com', label: 'Alice (user1@example.com)' },
  { value: 'user2@example.com', label: 'Bob (user2@example.com)' },
  { value: 'user3@example.com', label: 'Charlie (user3@example.com)' },
  { value: 'user4@example.com', label: 'Dana (user4@example.com)' },
];

export default function TeamsPage() {
  const theme = useMantineTheme();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState(mockUsers);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (error) {
      showNotification({ color: 'red', message: 'Failed to fetch teams' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users from /api/users (if it exists)
  const fetchUsers = async () => {
    try {
        const res = await fetch('/api/users');
        if (res.ok) {
            const data = await res.json();
            setUsers(data.map((u: any) => ({ value: u.email, label: `${u.name} (${u.email})` })));
        }
    } catch (error) {
        console.warn("Could not fetch users, using mock data.", error)
    }
  }

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const form = useForm({
    initialValues: {
      name: '',
      members: [],
    },
    validate: {
      name: (value) => (value.trim().length > 2 ? null : 'Team name must be at least 3 characters long'),
      members: (value) => (value.length > 0 ? null : 'A team must have at least one member'),
    },
  });

  const handleCreateTeam = async (values: typeof form.values) => {
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        showNotification({ color: 'green', message: 'Team created successfully!' });
        fetchTeams();
        form.reset();
      } else {
        throw new Error('Failed to create team');
      }
    } catch (error) {
      showNotification({ color: 'red', message: 'Failed to create team' });
    }
  };
  
  const directiveForm = useForm({
    initialValues: {
        message: '',
    },
    validate: {
        message: (value) => (value.trim().length > 0 ? null : 'Directive message cannot be empty'),
    }
  });

  const handleSendDirective = async (values: typeof directiveForm.values) => {
    if (!selectedTeam) return;
    const currentUserEmail = localStorage.getItem('user:username') || 'system';
    try {
        const res = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_directive',
                teamId: selectedTeam.id,
                message: values.message,
                from: currentUserEmail
            })
        });
        if(res.ok){
            showNotification({ color: 'green', message: `Directive sent to ${selectedTeam.name}` });
            directiveForm.reset();
        } else {
            throw new Error('Failed to send directive')
        }
    } catch(error){
        showNotification({ color: 'red', message: 'Failed to send directive' });
    }
  }

  if (loading) {
    return <Container pt="xl"><Group justify="center"><Loader /></Group></Container>;
  }

  return (
    <Container size="lg" mt="xl">
      <Title order={1} mb="xl">
        Team Management
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Left Column: Team List and Directive Sender */}
        <Stack>
          <Paper shadow="sm" p="lg" withBorder>
            <Title order={3} mb="md">
              All Teams
            </Title>
            <Stack>
              {teams.map((team: any) => (
                <Card
                  key={team.id}
                  shadow="xs"
                  p="sm"
                  radius="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedTeam?.id === team.id ? theme.colors.blue[6] : undefined,
                    borderWidth: selectedTeam?.id === team.id ? 2 : 1,
                  }}
                  onClick={() => setSelectedTeam(team)}
                >
                  <Text fw={500}>{team.name}</Text>
                  <Text size="sm" c="dimmed">
                    {team.members.length} member(s)
                  </Text>
                </Card>
              ))}
              {teams.length === 0 && <Text>No teams created yet.</Text>}
            </Stack>
          </Paper>

          {selectedTeam && (
            <Paper shadow="sm" p="lg" withBorder>
              <Title order={3} mb="md">
                Send Directive to {selectedTeam.name}
              </Title>
              <form onSubmit={directiveForm.onSubmit(handleSendDirective)}>
                <Stack>
                    <Textarea
                        label="Directive Message"
                        placeholder="Enter your message here..."
                        required
                        minRows={4}
                        {...directiveForm.getInputProps('message')}
                    />
                    <Button type="submit">Send Directive</Button>
                </Stack>
              </form>
            </Paper>
          )}
        </Stack>

        {/* Right Column: Create Team and Team Details */}
        <Stack>
          <Paper shadow="sm" p="lg" withBorder>
            <Title order={3} mb="md">
              Create New Team
            </Title>
            <form onSubmit={form.onSubmit(handleCreateTeam)}>
              <Stack>
                <TextInput
                  label="Team Name"
                  placeholder="e.g., 'Frontend Developers'"
                  required
                  {...form.getInputProps('name')}
                />
                <MultiSelect
                  label="Team Members"
                  placeholder="Select team members"
                  data={users}
                  searchable
                  required
                  {...form.getInputProps('members')}
                />
                <Button type="submit">Create Team</Button>
              </Stack>
            </form>
          </Paper>

          {selectedTeam && (
             <Paper shadow="sm" p="lg" withBorder>
                <Title order={3} mb="md">Team Details</Title>
                <Text fw={700} size="lg">{selectedTeam.name}</Text>
                <Text mt="md" fw={500}>Members:</Text>
                <Stack gap="xs" mt="sm">
                    {selectedTeam.members.map((email: string) => (
                        <Badge key={email} variant="light" size="lg">{users.find(u => u.value === email)?.label || email}</Badge>
                    ))}
                </Stack>
             </Paper>
          )}
        </Stack>
      </SimpleGrid>
    </Container>
  );
} 