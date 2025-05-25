import React, { useEffect, useState } from 'react';
import { askAI } from '../utils/ai';
import { Paper, Text, Group, Button, Loader, Stack } from '@mantine/core';
import { showNotification } from '@mantine/notifications';

interface Props {
    context: string;
    tab?: string;
    onEnable?: (suggestion: string) => void;
}

export default function AIWorkflowAutomation({ context, tab, onEnable }: Props) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchSuggestions = async () => {
        if (!userToken) return;
        setLoading(true);
        setError('');
        try {
            const prompt = `${context}\n\nAnalyze this project and suggest 3-5 workflow automations or optimizations. Return a JSON array of suggestions, each as a short actionable string. Example: ["Auto-assign overdue tasks to available members", "Send daily summary to team", "Remind assignees of upcoming deadlines"]`;
            const res = await askAI(prompt, userToken);
            const match = res.match(/\[[\s\S]*\]/);
            let arr: string[] = [];
            if (match) {
                arr = JSON.parse(match[0]);
            } else if (res.startsWith('[')) {
                arr = JSON.parse(res);
            } else {
                arr = res.split(/\n|\r/).map(s => s.trim()).filter(Boolean);
            }
            setSuggestions(arr);
        } catch (err: any) {
            setError(err.message || 'AI error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
        // eslint-disable-next-line
    }, [context]);

    const handleEnable = (suggestion: string) => {
        if (onEnable) {
            onEnable(suggestion);
        } else {
            showNotification({ title: 'Automation Enabled', message: suggestion, color: 'green' });
        }
    };

    return (
        <Paper p="md" radius={16} withBorder style={{ marginBottom: 24, background: '#f5f7fa', minWidth: 320, borderLeft: '4px solid #1769aa' }}>
            <Group justify="space-between" align="center" mb={8}>
                <Text fw={700} size="lg" color="blue">AI Workflow Automation</Text>
                <Button size="xs" variant="light" onClick={fetchSuggestions} loading={loading}>
                    Refresh
                </Button>
            </Group>
            {loading && <Loader size="sm" mt={8} />}
            {error && <Text c="red" mt={8}>{error}</Text>}
            <Stack gap={8} mt={8}>
                {suggestions.map((s, i) => (
                    <Paper key={i} p="sm" radius={8} style={{ background: '#e3eaff', border: '1px solid #1769aa' }}>
                        <Group justify="space-between" align="center">
                            <Text fw={500} color="blue">⚡ {s}</Text>
                            <Button size="xs" color="blue" variant="outline" onClick={() => handleEnable(s)}>
                                Enable
                            </Button>
                        </Group>
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
} 