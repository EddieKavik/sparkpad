import React, { useEffect, useState } from 'react';
import { askAI } from '../utils/ai';
import { Paper, Text, Group, Button, Loader, Stack, Progress } from '@mantine/core';

interface Props {
    context: string;
    chatMessages?: { sender: string; content: string }[];
}

export default function AISentimentInsights({ context, chatMessages }: Props) {
    const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative' | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [summary, setSummary] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchSentiment = async () => {
        if (!userToken) return;
        setLoading(true);
        setError('');
        try {
            let chatContext = '';
            if (chatMessages && chatMessages.length) {
                chatContext = '\nRecent chat messages:\n' + chatMessages.slice(-20).map(m => `${m.sender}: ${m.content}`).join('\n');
            }
            const prompt = `${context}${chatContext}\n\nAnalyze the team sentiment in this project. Return a JSON object with a 'sentiment' (positive, neutral, or negative), a 'score' (0-100, where 100 is very positive), a 'summary' (1-2 sentences), and a 'suggestions' array (tips to improve communication). Example: {"sentiment": "positive", "score": 85, "summary": "Team is engaged and positive.", "suggestions": ["Keep up the good work!"]}`;
            const res = await askAI(prompt, userToken);
            const match = res.match(/\{[\s\S]*\}/);
            if (match) {
                const obj = JSON.parse(match[0]);
                setSentiment(obj.sentiment);
                setScore(obj.score);
                setSummary(obj.summary);
                setSuggestions(obj.suggestions || []);
            } else {
                setSentiment(null);
                setScore(null);
                setSummary(res);
                setSuggestions([]);
            }
        } catch (err: any) {
            setError(err.message || 'AI error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSentiment();
        // eslint-disable-next-line
    }, [context, chatMessages]);

    let color: string = 'gray';
    if (sentiment === 'positive') color = 'green';
    else if (sentiment === 'neutral') color = 'yellow';
    else if (sentiment === 'negative') color = 'red';

    return (
        <Paper p="md" radius={16} withBorder style={{ marginBottom: 24, background: '#f8f9fa', minWidth: 320, borderLeft: `4px solid ${color === 'green' ? '#40c057' : color === 'yellow' ? '#ffd43b' : color === 'red' ? '#e57373' : '#adb5bd'}` }}>
            <Group justify="space-between" align="center" mb={8}>
                <Text fw={700} size="lg" color={color}>AI Sentiment Insights</Text>
                <Button size="xs" variant="light" onClick={fetchSentiment} loading={loading}>
                    Refresh
                </Button>
            </Group>
            {loading && <Loader size="sm" mt={8} />}
            {error && <Text c="red" mt={8}>{error}</Text>}
            {score !== null && (
                <Progress value={score} size="lg" radius="xl" color={color} mt={8} mb={8} />
            )}
            {sentiment && (
                <Text fw={600} size="xl" color={color}>
                    {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                    {score !== null ? ` (${score}/100)` : ''}
                </Text>
            )}
            {summary && <Text mt={8} c="dimmed">{summary}</Text>}
            {suggestions.length > 0 && <Text fw={600} mt={12} color="blue">AI Suggestions:</Text>}
            <Stack gap={8} mt={4}>
                {suggestions.map((s, i) => (
                    <Paper key={i} p="sm" radius={8} style={{ background: '#e3fcec', border: '1px solid #40c057' }}>
                        <Text fw={500} color="green">💡 {s}</Text>
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
} 