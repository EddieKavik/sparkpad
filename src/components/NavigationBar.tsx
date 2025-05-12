"use client";
import { useRouter, usePathname } from "next/navigation";
import { Group, Button, Text, Avatar, Menu, ActionIcon, rem, Modal, TextInput, Title, Badge, Tooltip, ThemeIcon, ScrollArea } from "@mantine/core";
import { IconMaximize, IconBell, IconSettings, IconUser, IconLogout, IconEdit, IconLock, IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { getInitials } from "@/utils/helpers";
import { useState, useEffect } from "react";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { useTheme } from '@/contexts/ThemeContext';
import "./Notification.css";

interface Notification {
    id: number;
    message: string;
    time: string;
    type: 'project' | 'system' | 'update';
    read: boolean;
    link?: string;
}

interface NavigationBarProps {
    userName?: string | null;
    onLogout?: () => void;
    showBackButton?: boolean;
}

export function NavigationBar({ userName, onLogout, showBackButton = false }: NavigationBarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme } = useTheme();
    const [modalOpened, setModalOpened] = useState(false);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notificationMenuOpened, setNotificationMenuOpened] = useState(false);

    const styles = {
        background: theme === 'futuristic'
            ? 'linear-gradient(90deg, rgba(18,22,40,0.92) 70%, rgba(40,30,60,0.85) 100%)'
            : '#fff',
        borderBottom: theme === 'futuristic' ? '1px solid #222a44' : '1px solid #e9ecef',
        boxShadow: theme === 'futuristic' ? '0 4px 24px 0 #1a1a2e77' : '0 2px 8px rgba(0,0,0,0.06)',
        color: theme === 'futuristic' ? '#fff' : '#1a1b1e',
        borderRadius: '0 0 32px 32px',
        margin: '0 0 24px 0',
        zIndex: 10,
        position: 'relative',
        backdropFilter: theme === 'futuristic' ? 'blur(14px)' : 'none',
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) return;

            try {
                const res = await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : [];
                    if (Array.isArray(data)) {
                        setNotifications(data.map(notification => ({
                            ...notification,
                            id: notification.id || Date.now(),
                            read: notification.read || false
                        })));
                    } else {
                        setNotifications([]);
                    }
                } else {
                    setNotifications([]);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
                setNotifications([]);
            }
        };

        // Initial fetch
        fetchNotifications();

        // Set up polling for new notifications
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, []);

    const getRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const addNotification = async (notification: Omit<Notification, 'id' | 'read'>) => {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;

        const newNotification: Notification = {
            ...notification,
            id: Date.now(),
            read: false,
            time: new Date().toISOString()
        };

        try {
            // Fetch existing notifications
            const res = await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`);
            let existingNotifications: Notification[] = [];
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    existingNotifications = data;
                }
            }

            // Add new notification to the beginning
            const updatedNotifications = [newNotification, ...existingNotifications];
            setNotifications(updatedNotifications);

            // Save to server
            await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(updatedNotifications)
            });

            // Play notification sound if available
            try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => { }); // Ignore errors if sound can't be played
            } catch { }

            // Show a toast notification
            showNotification({
                title: notification.type === 'project' ? 'New Project' :
                    notification.type === 'update' ? 'Project Update' : 'System Notification',
                message: notification.message,
                color: notification.type === 'project' ? 'green' :
                    notification.type === 'update' ? 'blue' : 'gray',
            });
        } catch (error) {
            console.error('Failed to add notification:', error);
        }
    };

    const markNotificationAsRead = async (id: number) => {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;

        const updatedNotifications = notifications.map(notification =>
            notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);

        // Update on server
        try {
            await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(updatedNotifications)
            });
        } catch (error) {
            console.error('Failed to update notification:', error);
        }
    };

    const markAllAsRead = async () => {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;

        const updatedNotifications = notifications.map(notification => ({
            ...notification,
            read: true
        }));
        setNotifications(updatedNotifications);

        // Update on server
        try {
            await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify(updatedNotifications)
            });
        } catch (error) {
            console.error('Failed to update notifications:', error);
        }
    };

    const clearNotifications = async () => {
        const userEmail = localStorage.getItem("user:username");
        if (!userEmail) return;

        setNotifications([]);

        // Clear on server
        try {
            await fetch(`http://localhost:3333/notifications?mode=disk&key=${encodeURIComponent(userEmail)}`, {
                method: "POST",
                body: JSON.stringify([])
            });
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        await markNotificationAsRead(notification.id);
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleNameClick = () => {
        setEditName(userName || "");
        setModalOpened(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const userEmail = localStorage.getItem("user:username") || "";
            if (!userEmail) throw new Error("User email not found in localStorage");
            const res = await fetch(
                `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail + ":username")}`,
                {
                    method: "POST",
                    body: editName,
                }
            );
            if (!res.ok) throw new Error((await res.text()) || "Failed to update name");
            const user = localStorage.getItem("user");
            if (user) {
                const parsed = JSON.parse(user);
                parsed.name = editName;
                localStorage.setItem("user", JSON.stringify(parsed));
            }
            setModalOpened(false);
            showNotification({
                title: "Success",
                message: "Name updated successfully!",
                color: "green",
            });
            window.location.reload();
        } catch (err: any) {
            showNotification({
                title: "Error",
                message: err.message || "Failed to update name.",
                color: "red",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setChangingPassword(true);
        try {
            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification({ title: "Error", message: "All fields are required.", color: "red" });
                return;
            }
            if (newPassword !== confirmPassword) {
                showNotification({ title: "Error", message: "New passwords do not match.", color: "red" });
                return;
            }
            const userEmail = localStorage.getItem("user:username") || "";
            if (!userEmail) throw new Error("User email not found in localStorage");
            const res = await fetch(
                `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail)}`
            );
            if (!res.ok) throw new Error("Failed to fetch current password");
            const encryptedPassword = await res.text();
            const saltB64 = extractSaltFromEncrypted(encryptedPassword);
            const encryptedInput = await encryptPassword(currentPassword, saltB64);
            if (encryptedInput !== encryptedPassword) {
                showNotification({ title: "Error", message: "Current password is incorrect.", color: "red" });
                return;
            }
            const newEncrypted = await encryptPassword(newPassword);
            const resSet = await fetch(
                `http://localhost:3333/users?mode=volatile&key=${encodeURIComponent(userEmail)}`,
                {
                    method: "POST",
                    body: newEncrypted,
                }
            );
            if (!resSet.ok) throw new Error("Failed to update password");
            showNotification({ title: "Success", message: "Password changed successfully!", color: "green" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            showNotification({ title: "Error", message: err.message || "Failed to change password.", color: "red" });
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <>
            <Group justify="space-between" align="center" p="md" style={styles}>
                <Group>
                    {/* Navigation Tabs */}
                    <Group gap="md">
                        <Button
                            component={Link}
                            href="/"
                            variant={pathname === "/" ? "filled" : "subtle"}
                            color={theme === 'futuristic' ? 'violet' : 'blue'}
                            size="sm"
                            style={{
                                background: pathname === "/" ? (theme === 'futuristic' ? 'linear-gradient(90deg, #232b4d 0%, #3a2e5d 100%)' : '#228be6') : undefined,
                                color: pathname === "/" ? '#fff' : (theme === 'classic' ? '#1a1b1e' : undefined),
                                boxShadow: pathname === "/" ? (theme === 'futuristic' ? '0 2px 12px #232b4d88' : '0 2px 8px rgba(0,0,0,0.06)') : undefined,
                                borderRadius: 16,
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                border: pathname === "/" ? (theme === 'futuristic' ? '1.5px solid #4f5b93' : '1px solid #228be6') : undefined
                            }}
                        >
                            Dashboard
                        </Button>
                        <Button
                            component={Link}
                            href="/projects"
                            variant={pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? "filled" : "subtle"}
                            color={theme === 'futuristic' ? 'violet' : 'blue'}
                            size="sm"
                            style={{
                                background: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? (theme === 'futuristic' ? 'linear-gradient(90deg, #2e254d 0%, #1a1a2e 100%)' : '#228be6') : undefined,
                                color: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? '#fff' : (theme === 'classic' ? '#1a1b1e' : undefined),
                                boxShadow: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? (theme === 'futuristic' ? '0 2px 12px #2e254d88' : '0 2px 8px rgba(0,0,0,0.06)') : undefined,
                                borderRadius: 16,
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                border: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? (theme === 'futuristic' ? '1.5px solid #4f5b93' : '1px solid #228be6') : undefined
                            }}
                        >
                            Projects
                        </Button>
                        <Button
                            component={Link}
                            href="/projects?showStats=1"
                            variant={pathname === "/projects" && pathname.includes("showStats=1") ? "filled" : "subtle"}
                            color={theme === 'futuristic' ? 'violet' : 'blue'}
                            size="sm"
                            style={{
                                background: pathname === "/projects" && pathname.includes("showStats=1") ? (theme === 'futuristic' ? 'linear-gradient(90deg, #2d3a5d 0%, #232b4d 100%)' : '#228be6') : undefined,
                                color: pathname === "/projects" && pathname.includes("showStats=1") ? '#fff' : (theme === 'classic' ? '#1a1b1e' : undefined),
                                boxShadow: pathname === "/projects" && pathname.includes("showStats=1") ? (theme === 'futuristic' ? '0 2px 12px #2d3a5d88' : '0 2px 8px rgba(0,0,0,0.06)') : undefined,
                                borderRadius: 16,
                                fontWeight: 700,
                                letterSpacing: 0.5,
                                border: pathname === "/projects" && pathname.includes("showStats=1") ? (theme === 'futuristic' ? '1.5px solid #4f5b93' : '1px solid #228be6') : undefined
                            }}
                        >
                            Statistics
                        </Button>
                    </Group>
                </Group>
                <Group>
                    <Menu
                        shadow="md"
                        width={360}
                        position="bottom-end"
                        opened={notificationMenuOpened}
                        onChange={setNotificationMenuOpened}
                    >
                        <Menu.Target>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                className="notification-bell"
                                style={{
                                    marginRight: 16,
                                    marginLeft: 8,
                                    background: 'transparent',
                                    zIndex: 2
                                }}
                            >
                                <IconBell size={22} color="#b0b7ff" />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="notification-badge">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                )}
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>
                                <Group justify="space-between">
                                    <Text size="sm" fw={500}>Notifications</Text>
                                    {notifications.length > 0 && (
                                        <Group gap="xs">
                                            <ActionIcon
                                                variant="subtle"
                                                color="gray"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAllAsRead();
                                                }}
                                            >
                                                <IconCheck size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearNotifications();
                                                }}
                                            >
                                                <IconX size={16} />
                                            </ActionIcon>
                                        </Group>
                                    )}
                                </Group>
                            </Menu.Label>
                            <ScrollArea h={300}>
                                {notifications.length === 0 ? (
                                    <Text c="dimmed" size="sm" ta="center" py="md">
                                        No notifications
                                    </Text>
                                ) : (
                                    notifications.map((notification) => (
                                        <Menu.Item
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            style={{
                                                backgroundColor: notification.read ? 'transparent' : 'var(--mantine-color-blue-0)',
                                            }}
                                        >
                                            <Group>
                                                <div style={{ flex: 1 }}>
                                                    <Text size="sm">{notification.message}</Text>
                                                    <Text size="xs" c="dimmed">{notification.time}</Text>
                                                </div>
                                                {!notification.read && (
                                                    <Badge size="xs" color="blue">New</Badge>
                                                )}
                                            </Group>
                                        </Menu.Item>
                                    ))
                                )}
                            </ScrollArea>
                        </Menu.Dropdown>
                    </Menu>
                    {userName && (
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <Group style={{ cursor: 'pointer', marginLeft: 12, color: '#fff', fontWeight: 600, textShadow: '0 2px 8px #232b4d' }} gap={8} onClick={handleNameClick}>
                                    <Avatar radius="xl" color="violet" size={32} style={{ boxShadow: '0 0 8px #7f5fff88', border: '2px solid #232b4d' }}>
                                        {getInitials(userName)}
                                    </Avatar>
                                    <Text size="sm" fw={600} style={{ color: '#fff', marginLeft: 6 }}>{userName}</Text>
                                </Group>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={16} />} onClick={handleNameClick}>
                                    Edit Profile
                                </Menu.Item>
                                <Menu.Item leftSection={<IconLock size={16} />} onClick={() => setModalOpened(true)}>
                                    Change Password
                                </Menu.Item>
                                <Menu.Item leftSection={<IconLogout size={16} />} onClick={onLogout}>
                                    Logout
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    )}
                    <Tooltip label="Fullscreen">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            radius="md"
                            style={{ padding: 0, minWidth: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
                            onClick={() => {
                                if (document.fullscreenElement) {
                                    document.exitFullscreen();
                                } else {
                                    document.body.requestFullscreen();
                                }
                            }}
                        >
                            <IconMaximize size={22} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Profile" centered>
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
        </>
    );
}

async function encryptPassword(password: string, saltB64?: string): Promise<string> {
    if (!saltB64) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const enc = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const rawKey = await window.crypto.subtle.exportKey("raw", derivedKey);
        const combined = new Uint8Array(salt.length + rawKey.byteLength);
        combined.set(salt, 0);
        combined.set(new Uint8Array(rawKey), salt.length);
        return btoa(String.fromCharCode(...combined));
    } else {
        const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
        const enc = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256",
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const rawKey = await window.crypto.subtle.exportKey("raw", derivedKey);
        const combined = new Uint8Array(salt.length + rawKey.byteLength);
        combined.set(salt, 0);
        combined.set(new Uint8Array(rawKey), salt.length);
        return btoa(String.fromCharCode(...combined));
    }
}

function extractSaltFromEncrypted(encrypted: string): string {
    const bytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const salt = bytes.slice(0, 16);
    return btoa(String.fromCharCode(...salt));
} 