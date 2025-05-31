import React, { useEffect, useState } from 'react';
import { askAI } from '../utils/ai';
import { Paper, Text, Group, Button, Loader, Stack } from '@mantine/core';

interface Props {
    context: string;
    onMitigate?: (suggestion: string) => void;
}

export default function AIRiskAlerts({ context, onMitigate }: Props) {
    const [risks, setRisks] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchRisks = async () => {
        if (!userToken) return;
        setLoading(true);
        setError('');
        try {
            const prompt = `${context}\n\nAnalyze this project and return a JSON object with a 'risks' array (each a short string) and a 'suggestions' array (each a short string with a recommended action). Example: {"risks": ["2 tasks are overdue"], "suggestions": ["Reassign overdue tasks"]}`;
            const res = await askAI(prompt, userToken);
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const obj = JSON.parse(match[0]);
                setRisks(obj.risks || []);
                setSuggestions(obj.suggestions || []);
            } else {
                setRisks([]);
                setSuggestions([]);
            }
        } catch (err: any) {
            let msg = err?.message || 'AI error';
            if (msg.includes('No Gemini API key')) {
                msg = 'AI is not available: missing Gemini API key. Please contact the administrator.';
            } else if (msg.includes('Failed to fetch')) {
                msg = 'Could not connect to the AI service. Please check your network or try again later.';
            } else if (msg.includes('AI request failed')) {
                msg = 'AI request failed. Please try again or check your API key.';
            }
            setError(msg);
            // Fallback suggestions if AI fails
            setRisks(['AI could not analyze risks at this time.']);
            setSuggestions(['Check project deadlines manually.', 'Review overdue tasks.', 'Ensure all team members are assigned.']);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRisks();
        // eslint-disable-next-line
    }, [context]);

    return (
        <Paper p="md" radius={16} withBorder style={{ marginBottom: 24, background: '#fff', minWidth: 320, borderLeft: '4px solid #e57373' }}>
            <Group justify="space-between" align="center" mb={8}>
                <Text fw={700} size="lg" color="red">AI Risk Alerts</Text>
                <Button size="xs" variant="light" onClick={fetchRisks} loading={loading}>
                    Refresh
                </Button>
            </Group>
            {loading && <Loader size="sm" mt={8} />}
            {error && <Text c="red" mt={8}>{error}</Text>}
            <Stack gap={8} mt={8}>
                {risks.map((risk, i) => (
                    <Paper key={i} p="sm" radius={8} style={{ background: '#ffeaea', border: '1px solid #e57373' }}>
                        <Text fw={600} color="red">⚠️ {risk}</Text>
                    </Paper>
                ))}
                {suggestions.length > 0 && <Text fw={600} mt={8} color="blue">AI Suggestions:</Text>}
                {suggestions.map((s, i) => (
                    <Paper key={i} p="sm" radius={8} style={{ background: '#e3fcec', border: '1px solid #40c057' }}>
                        <Group justify="space-between" align="center">
                            <Text fw={500} color="green">💡 {s}</Text>
                            <Button size="xs" color="green" variant="outline" onClick={() => onMitigate ? onMitigate(s) : alert(`Mitigation: ${s}`)}>
                                Action
                            </Button>
                        </Group>
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
} 