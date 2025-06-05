"use client";
import { useRouter, usePathname } from "next/navigation";
import { Group, Button, Text, Avatar, Menu, ActionIcon, rem, Modal, TextInput, Title, Badge, Tooltip, ThemeIcon, ScrollArea, Drawer, Stack, Divider } from "@mantine/core";
import { IconMaximize, IconBell, IconSettings, IconUser, IconLogout, IconEdit, IconLock, IconArrowLeft, IconCheck, IconX, IconMenu } from "@tabler/icons-react";
import { getInitials } from "@/utils/helpers";
import { useState, useEffect } from "react";
import { showNotification } from "@mantine/notifications";
import Link from "next/link";
import { useTheme } from '@/contexts/ThemeContext';
import "./Notification.css";
import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

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
    const pathname = usePathname() || "";
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const themeObj = useMantineTheme();
    const isMobile = useMediaQuery(`(max-width: 768px)`);
    const [drawerOpened, setDrawerOpened] = useState(false);

    const isMarketingPage = !isLoggedIn;
    const styles = {
        background: 'transparent',
        borderBottom: '1px solid #e3e8ee',
        boxShadow: 'none',
        color: isMarketingPage ? '#1a1b1e' : (theme === 'futuristic' ? '#fff' : '#1a1b1e'),
        borderRadius: 0,
        margin: 0,
        zIndex: 10,
        position: 'relative',
        minHeight: 58,
        padding: '0 0',
        backdropFilter: isMarketingPage ? 'none' : (theme === 'futuristic' ? 'blur(14px)' : 'none'),
    };

    useEffect(() => {
        const fetchNotifications = async () => {
            const userEmail = localStorage.getItem("user:username");
            if (!userEmail) return;

            try {
                const res = await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`);
                if (res.ok) {
                    const text = await res.text();
                    const data = text ? JSON.parse(text) : [];
                    if (Array.isArray(data)) {
                        setNotifications(data
                            .filter(notification => notification.message && notification.message.trim() !== "")
                            .map(notification => ({
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsLoggedIn(!!localStorage.getItem('token'));
        }
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
            const res = await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`);
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
            await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`, {
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
            await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`, {
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
            await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`, {
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
            await fetch(`http://localhost:3333/?mode=disk&key=notifications:${encodeURIComponent(userEmail)}`, {
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
                `http://localhost:3333/?mode=volatile&key=user:${encodeURIComponent(userEmail + ":username")}`,
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
                `http://localhost:3333/?mode=volatile&key=user:${encodeURIComponent(userEmail)}`
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
                `http://localhost:3333/?mode=volatile&key=user:${encodeURIComponent(userEmail)}`,
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

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('user:username');
        window.location.href = '/login';
    };

    return (
        <>
            <Group justify="space-between" align="center" p={0} style={styles}>
                <Group align="center" gap={0} style={{ minHeight: 58, paddingLeft: 16 }}>
                    <Link href="/" style={{ color: '#1769aa', fontWeight: 900, fontSize: 24, letterSpacing: 1, textDecoration: 'none', padding: '0 0', borderBottom: '2px solid transparent', transition: 'color 0.2s, border-bottom 0.2s', display: 'flex', alignItems: 'center', height: 58 }}>Sparkpad</Link>
                    {isMobile ? (
                        <ActionIcon size={40} variant="subtle" color="blue" onClick={() => setDrawerOpened(true)} style={{ marginLeft: 8 }}>
                            <IconMenu size={28} />
                        </ActionIcon>
                    ) : (
                        <Group gap={0} style={{ marginLeft: 16 }}>
                            {!isLoggedIn && <>
                                <Link href="/about" style={{
                                    color: pathname.startsWith("/about") ? '#1769aa' : '#222',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '0 18px',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: pathname.startsWith("/about") ? '2px solid #1769aa' : '2px solid transparent',
                                    background: 'none',
                                    textDecoration: 'none',
                                    transition: 'color 0.18s, border-bottom 0.18s',
                                }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/about") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/about") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                >About</Link>
                                <Link href="/products" style={{
                                    color: pathname.startsWith("/products") ? '#1769aa' : '#222',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '0 18px',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: pathname.startsWith("/products") ? '2px solid #1769aa' : '2px solid transparent',
                                    background: 'none',
                                    textDecoration: 'none',
                                    transition: 'color 0.18s, border-bottom 0.18s',
                                }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/products") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/products") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                >Products</Link>
                                <Link href="/services" style={{
                                    color: pathname.startsWith("/services") ? '#1769aa' : '#222',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '0 18px',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: pathname.startsWith("/services") ? '2px solid #1769aa' : '2px solid transparent',
                                    background: 'none',
                                    textDecoration: 'none',
                                    transition: 'color 0.18s, border-bottom 0.18s',
                                }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/services") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/services") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                >Services</Link>
                                <Link href="/contact" style={{
                                    color: pathname.startsWith("/contact") ? '#1769aa' : '#222',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '0 18px',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: pathname.startsWith("/contact") ? '2px solid #1769aa' : '2px solid transparent',
                                    background: 'none',
                                    textDecoration: 'none',
                                    transition: 'color 0.18s, border-bottom 0.18s',
                                }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/contact") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/contact") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                >Contact Us</Link>
                                <Link href="/login" style={{
                                    color: pathname.startsWith("/login") ? '#1769aa' : '#222',
                                    fontWeight: 600,
                                    fontSize: 16,
                                    padding: '0 18px',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderBottom: pathname.startsWith("/login") ? '2px solid #1769aa' : '2px solid transparent',
                                    background: 'none',
                                    textDecoration: 'none',
                                    transition: 'color 0.18s, border-bottom 0.18s',
                                    marginLeft: 12
                                }}
                                    onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                    onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/login") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/login") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                >Login</Link>
                            </>}
                            {isLoggedIn && (
                                <>
                                    <Link href="/projects" style={{
                                        color: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? '#1769aa' : '#222',
                                        fontWeight: 600,
                                        fontSize: 16,
                                        padding: '0 18px',
                                        height: 40,
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderBottom: pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? '2px solid #1769aa' : '2px solid transparent',
                                        background: 'none',
                                        textDecoration: 'none',
                                        transition: 'color 0.18s, border-bottom 0.18s',
                                    }}
                                        onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                        onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/projects") && !pathname.includes("showStats=1") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                    >Projects</Link>
                                    <Link href="http://localhost:3000/accounting" style={{
                                        color: pathname.startsWith("/accounting") ? '#1769aa' : '#222',
                                        fontWeight: 600,
                                        fontSize: 16,
                                        padding: '0 18px',
                                        height: 40,
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderBottom: pathname.startsWith("/accounting") ? '2px solid #1769aa' : '2px solid transparent',
                                        background: 'none',
                                        textDecoration: 'none',
                                        transition: 'color 0.18s, border-bottom 0.18s',
                                    }}
                                        onMouseOver={e => { e.currentTarget.style.color = '#124c7c'; e.currentTarget.style.borderBottom = '2px solid #1769aa'; }}
                                        onMouseOut={e => { e.currentTarget.style.color = pathname.startsWith("/accounting") ? '#1769aa' : '#222'; e.currentTarget.style.borderBottom = pathname.startsWith("/accounting") ? '2px solid #1769aa' : '2px solid transparent'; }}
                                    >Financial Accounts</Link>
                                </>
                            )}
                        </Group>
                    )}
                </Group>
                {!isMobile && (
                    <Group align="center" gap={0} style={{ minHeight: 58, paddingRight: 32 }}>
                        {isLoggedIn && (
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
                                                            if (window.confirm('Clear all notifications? This cannot be undone.')) {
                                                                clearNotifications();
                                                            }
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
                                            notifications
                                                .filter(notification => notification.message && notification.message.trim() !== "")
                                                .map((notification) => (
                                                    <Menu.Item
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        style={{
                                                            backgroundColor: notification.read ? 'transparent' : 'var(--mantine-color-blue-0)',
                                                        }}
                                                    >
                                                        <Group>
                                                            <div style={{ flex: 1 }}>
                                                                <Text size="sm">{notification.message || "No details"}</Text>
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
                        )}
                        {isLoggedIn && (
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <Group style={{ cursor: 'pointer', marginLeft: 16, color: '#1769aa', fontWeight: 600 }} gap={8}>
                                        <Avatar radius="xl" color="blue" size={32} style={{ border: '2px solid #1769aa', background: 'transparent', color: '#1769aa', fontWeight: 700 }}>
                                            {getInitials(userName || localStorage.getItem('user:username') || 'U')}
                                        </Avatar>
                                        <Text size="sm" fw={700} style={{ color: '#1769aa', marginLeft: 6 }}>{userName || localStorage.getItem('user:username') || 'User'}</Text>
                                    </Group>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item leftSection={<IconEdit size={16} />} onClick={handleNameClick}>
                                        Edit Profile
                                    </Menu.Item>
                                    <Menu.Item leftSection={<IconLock size={16} />} onClick={() => setModalOpened(true)}>
                                        Change Password
                                    </Menu.Item>
                                    <Menu.Item leftSection={<IconLogout size={16} />} onClick={handleLogout} style={{ color: '#d32f2f', fontWeight: 700 }}>
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
                )}
            </Group>

            <Drawer
                opened={drawerOpened}
                onClose={() => setDrawerOpened(false)}
                title={<Text fw={700} size="lg" color="blue">Menu</Text>}
                padding="md"
                size="80vw"
                position="left"
                overlayProps={{ color: themeObj.colorScheme === 'dark' ? themeObj.colors.dark[9] : themeObj.colors.gray[2], opacity: 0.55, blur: 2 }}
                zIndex={1000}
            >
                <Stack gap="md">
                    {!isLoggedIn && <>
                        <Link href="/about" onClick={() => setDrawerOpened(false)}><Text size="lg">About</Text></Link>
                        <Link href="/products" onClick={() => setDrawerOpened(false)}><Text size="lg">Products</Text></Link>
                        <Link href="/services" onClick={() => setDrawerOpened(false)}><Text size="lg">Services</Text></Link>
                        <Link href="/contact" onClick={() => setDrawerOpened(false)}><Text size="lg">Contact Us</Text></Link>
                        <Link href="/login" onClick={() => setDrawerOpened(false)}><Text size="lg">Login</Text></Link>
                    </>}
                    {isLoggedIn && <>
                        <Link href="/projects" onClick={() => setDrawerOpened(false)}><Text size="lg">Projects</Text></Link>
                        <Link href="http://localhost:3000/accounting" onClick={() => setDrawerOpened(false)}><Text size="lg">Financial Accounts</Text></Link>
                    </>}
                    <Divider my="sm" />
                    {isLoggedIn && <>
                        <Text fw={600} size="md" color="blue">Notifications</Text>
                        <ScrollArea h={180}>
                            {notifications.length === 0 ? (
                                <Text c="dimmed" size="sm" ta="center" py="md">No notifications</Text>
                            ) : (
                                notifications.filter(n => n.message && n.message.trim() !== "").map(notification => (
                                    <Group key={notification.id} onClick={() => { handleNotificationClick(notification); setDrawerOpened(false); }} style={{ cursor: 'pointer', padding: 4, borderRadius: 8, background: notification.read ? 'transparent' : '#e3eaff' }}>
                                        <Text size="sm">{notification.message}</Text>
                                        {!notification.read && <Badge size="xs" color="blue">New</Badge>}
                                    </Group>
                                ))
                            )}
                        </ScrollArea>
                        <Button size="xs" variant="light" mt={8} onClick={() => { markAllAsRead(); }}>Mark all as read</Button>
                    </>}
                    <Divider my="sm" />
                    {isLoggedIn && <>
                        <Group gap={8} align="center">
                            <Avatar radius="xl" color="blue" size={32} style={{ border: '2px solid #1769aa', background: 'transparent', color: '#1769aa', fontWeight: 700 }}>{getInitials(userName || localStorage.getItem('user:username') || 'U')}</Avatar>
                            <Text size="md" fw={700} style={{ color: '#1769aa' }}>{userName || localStorage.getItem('user:username') || 'User'}</Text>
                        </Group>
                        <Button fullWidth variant="light" leftSection={<IconEdit size={16} />} onClick={() => { handleNameClick(); setDrawerOpened(false); }}>Edit Profile</Button>
                        <Button fullWidth variant="light" leftSection={<IconLock size={16} />} onClick={() => { setModalOpened(true); setDrawerOpened(false); }}>Change Password</Button>
                        <Button fullWidth variant="light" color="red" leftSection={<IconLogout size={16} />} onClick={() => { handleLogout(); setDrawerOpened(false); }}>Logout</Button>
                    </>}
                </Stack>
            </Drawer>

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