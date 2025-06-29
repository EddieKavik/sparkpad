'use client';

import React, { useState, useEffect } from 'react';
import { Group, Button, Popover, Text, Stack, ActionIcon, Indicator, Avatar, Menu, Badge, Tooltip, ScrollArea, Modal, TextInput, Title } from '@mantine/core';
import { IconBell, IconCheck, IconX, IconEdit, IconLock, IconLogout, IconMaximize } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function getInitials(name: string) {
  if (!name) return 'U';
  const parts = name.split('@')[0].split(/[ ._]/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
}

export function AppHeader() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [userName, setUserName] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUserName(localStorage.getItem('user:username') || 'User');
    setMounted(true);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const userId = localStorage.getItem('user:username');
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true })
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user:username');
    window.location.href = '/login';
  };

  const handleNameClick = () => {
    setEditName(userName || '');
    setModalOpened(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userEmail = localStorage.getItem('user:username') || '';
      if (!userEmail) throw new Error('User email not found in localStorage');
      // Simulate API call to update name
      // ...
      setModalOpened(false);
      setUserName(editName);
    } catch (err: any) {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setChangingPassword(true);
    try {
      // Simulate API call to change password
      // ...
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      // Handle error
    } finally {
      setChangingPassword(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Group justify="space-between" align="center" style={{ minHeight: 60, background: '#1769aa', color: '#fff', padding: '0 32px', borderBottom: '1px solid #124c7c', width: '100vw', boxSizing: 'border-box' }}>
      {/* Left: Logo and navigation */}
      <Group align="center" gap={0}>
        <Link href="/" style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', height: 60 }}>SparkPad</Link>
        <Button variant="subtle" color="#fff" style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginLeft: 24 }} onClick={() => router.push('/projects')}>Projects</Button>
        <Button variant="subtle" color="#fff" style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginLeft: 8 }} onClick={() => router.push('/teams')}>Teams</Button>
      </Group>
      {/* Right: Notifications and user info */}
      <Group align="center" gap={0}>
        <Popover
          opened={popoverOpened}
          onClose={() => setPopoverOpened(false)}
          onChange={setPopoverOpened}
          position="bottom-end"
          width={380}
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Indicator label={unreadCount} size={16} disabled={unreadCount === 0} color="red">
              <ActionIcon variant="subtle" size="lg" onClick={() => setPopoverOpened((o) => !o)} style={{ color: '#fff', marginRight: 16 }}>
                <IconBell />
              </ActionIcon>
            </Indicator>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack>
              <Text fw={500}>Notifications</Text>
              {notifications.length === 0 ? (
                <Text c="dimmed" ta="center">You have no new notifications.</Text>
              ) : (
                notifications.map((n: any) => (
                  <Group key={n.id} justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={0}>
                      <Text size="sm">{n.message}</Text>
                      <Text size="xs" c="dimmed">From: {n.from} • {new Date(n.timestamp).toLocaleString()}</Text>
                    </Stack>
                    {!n.read && (
                      <ActionIcon variant="subtle" size="sm" onClick={() => handleMarkAsRead(n.id)} title="Mark as read">
                        <IconCheck />
                      </ActionIcon>
                    )}
                  </Group>
                ))
              )}
            </Stack>
          </Popover.Dropdown>
        </Popover>
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <Group style={{ cursor: 'pointer', marginLeft: 16, color: '#fff', fontWeight: 600 }} gap={8}>
              <Avatar radius="xl" color="blue" size={32} style={{ border: '2px solid #fff', background: 'transparent', color: '#fff', fontWeight: 700 }}>
                {getInitials(userName)}
              </Avatar>
              <Text size="sm" fw={700} style={{ color: '#fff', marginLeft: 6 }}>{userName}</Text>
            </Group>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={handleNameClick}>Edit Profile</Menu.Item>
            <Menu.Item leftSection={<IconLock size={16} />} onClick={() => setModalOpened(true)}>Change Password</Menu.Item>
            <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout} style={{ color: '#d32f2f', fontWeight: 700 }}>Logout</Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <ActionIcon variant="subtle" color="gray" size="lg" style={{ marginLeft: 8, color: '#fff' }}>
          <IconMaximize size={22} />
        </ActionIcon>
      </Group>
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Profile / Change Password" centered>
        <TextInput
          label="Name"
          value={editName}
          onChange={(e) => setEditName(e.currentTarget.value)}
          mb="md"
        />
        <Button onClick={handleSave} loading={saving} fullWidth mb="md">
          Save
        </Button>
        <Title order={5} mt="md" mb="xs">Change Password</Title>
        <TextInput
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          mb="xs"
        />
        <TextInput
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
          mb="xs"
        />
        <TextInput
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          mb="md"
        />
        <Button onClick={handleChangePassword} loading={changingPassword} fullWidth color="violet">
          Change Password
        </Button>
      </Modal>
    </Group>
  );
} 