"use client";
import { useState } from "react";
import {
    TextInput,
    PasswordInput,
    Button,
    Box,
    Title,
    Paper,
    Stack,
    Group,
    Text,
    Center,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconSparkles } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

async function encryptPassword(password: string): Promise<string> {
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
}

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const encryptedPassword = await encryptPassword(password);

            // Store encrypted password
            const passwordRes = await fetch(
                "http://localhost:3333/users?mode=volatile&key=" + encodeURIComponent(email),
                {
                    method: "POST",
                    body: encryptedPassword,
                }
            );
            const passwordResText = await passwordRes.text();
            if (!passwordRes.ok) {
                console.error("Password storage failed:", passwordRes.status, passwordResText);
                throw new Error(`Failed to store password: ${passwordResText || passwordRes.status}`);
            }

            // Store username
            const usernameRes = await fetch(
                "http://localhost:3333/users?mode=volatile&key=" + encodeURIComponent(email + ':username'),
                {
                    method: "POST",
                    body: email,
                }
            );
            const usernameResText = await usernameRes.text();
            if (!usernameRes.ok) {
                console.error("Username storage failed:", usernameRes.status, usernameResText);
                throw new Error(`Failed to store username: ${usernameResText || usernameRes.status}`);
            }

            showNotification({
                title: "Success",
                message: "Registration successful!",
                color: "green",
            });
            localStorage.setItem("user:username", email);
            setEmail("");
            setPassword("");
            setTimeout(() => router.push("/login"), 500);
        } catch (err: any) {
            console.error("Sign-up error:", err);
            showNotification({
                title: "Error",
                message: err.message || "Registration failed.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181c2b 0%, #23243a 100%)', position: 'relative', overflow: 'hidden' }}>
            {/* Futuristic Glow Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                background: 'radial-gradient(circle at 80% 20%, #3a2e5d44 0%, transparent 60%), radial-gradient(circle at 20% 80%, #232b4d44 0%, transparent 60%)',
                filter: 'blur(48px)',
            }} />
            <Center style={{ minHeight: '100vh', zIndex: 1 }}>
                <Paper shadow="md" p={32} radius={32} withBorder style={{ background: 'rgba(24,28,43,0.92)', border: '1.5px solid #3a2e5d44', boxShadow: '0 8px 32px 0 #232b4d44', color: '#fff', maxWidth: 400, width: '100%', backdropFilter: 'blur(16px)' }}>
                    <Group justify="center" mb={24}>
                        <IconSparkles size={36} color="#7f5fff" />
                        <Title order={2} style={{ color: '#fff', fontWeight: 800, letterSpacing: 1 }}>Create Account</Title>
                    </Group>
                    <Text c="#b0b7ff" size="md" ta="center" mb={24}>
                        Join the future of collaboration
                    </Text>
                    <form onSubmit={handleSubmit}>
                        <Stack gap={16}>
                            <TextInput
                                label="Name"
                                value={name}
                                onChange={(e) => setName(e.currentTarget.value)}
                                required
                                size="md"
                                style={{ background: 'rgba(35,43,77,0.18)', color: '#b0b7ff', borderRadius: 12 }}
                            />
                            <TextInput
                                label="Email"
                                value={email}
                                onChange={(e) => setEmail(e.currentTarget.value)}
                                required
                                size="md"
                                style={{ background: 'rgba(35,43,77,0.18)', color: '#b0b7ff', borderRadius: 12 }}
                            />
                            <PasswordInput
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                required
                                size="md"
                                style={{ background: 'rgba(35,43,77,0.18)', color: '#b0b7ff', borderRadius: 12 }}
                            />
                            <Button type="submit" fullWidth size="md" variant="gradient" gradient={{ from: '#232b4d', to: '#3a2e5d', deg: 90 }} style={{ fontWeight: 700, color: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #232b4d44' }} loading={loading}>
                                Sign Up
                            </Button>
                        </Stack>
                    </form>
                    <Group justify="center" mt={24}>
                        <Text c="#b0b7ff" size="sm">Already have an account?</Text>
                        <Button component={Link} href="/login" variant="subtle" size="sm" style={{ color: '#7f5fff', fontWeight: 700, borderRadius: 12 }}>
                            Sign In
                        </Button>
                    </Group>
                </Paper>
            </Center>
        </Box>
    );
} 
