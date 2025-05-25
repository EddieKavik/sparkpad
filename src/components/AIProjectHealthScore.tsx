import React, { useEffect, useState } from 'react';
import { askAI } from '../utils/ai';
import { Paper, Text, Group, Button, Loader, Progress } from '@mantine/core';

interface Props {
    context: string;
}

export default function AIProjectHealthScore({ context }: Props) {
    const [score, setScore] = useState<number | null>(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchHealth = async () => {
        if (!userToken) return;
        setLoading(true);
        setError('');
        try {
            const prompt = `${context}\n\nAnalyze this project and return a JSON object with a healthScore (0-100) and a short summary. Example: {"healthScore": 85, "summary": "Project is on track, but 2 tasks are overdue."}`;
            const res = await askAI(prompt, userToken);
            // Try to parse JSON from AI response
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const obj = JSON.parse(match[0]);
                setScore(obj.healthScore);
                setSummary(obj.summary);
            } else {
                setSummary(res);
                setScore(null);
            }
        } catch (err: any) {
            setError(err.message || 'AI error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // eslint-disable-next-line
    }, [context]);

    return (
        <Paper p="md" radius={16} withBorder style={{ marginBottom: 24, background: '#f5f7fa', minWidth: 320 }}>
            <Group justify="space-between" align="center" mb={8}>
                <Text fw={700} size="lg">AI Project Health Score</Text>
                <Button size="xs" variant="light" onClick={fetchHealth} loading={loading}>
                    Refresh
                </Button>
            </Group>
            {loading && <Loader size="sm" mt={8} />}
            {error && <Text c="red" mt={8}>{error}</Text>}
            {score !== null && (
                <>
                    <Progress value={score} size="lg" radius="xl" color={score > 70 ? 'green' : score > 40 ? 'yellow' : 'red'} mt={8} mb={8} />
                    <Text fw={600} size="xl" color={score > 70 ? 'green' : score > 40 ? 'yellow' : 'red'}>
                        {score}/100
                    </Text>
                </>
            )}
            {summary && <Text mt={8} c="dimmed">{summary}</Text>}
        </Paper>
    );
} 