import React, { useState } from 'react';
import { askAI } from '../utils/ai';
import { Button, Textarea, Paper, Text, Loader, Group } from '@mantine/core';

/**
 * AskAI component
 * @param context (optional) - string to prepend to the prompt for context-aware AI answers
 */
export default function AskAI({ context = '' }: { context?: string }) {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!userToken) return null;

    const handleAsk = async () => {
        setLoading(true);
        setError('');
        setResponse('');
        try {
            const fullPrompt = context ? `${context}\nUser Question: ${prompt}` : prompt;
            const res = await askAI(fullPrompt, userToken);
            setResponse(res);
        } catch (err: any) {
            setError(err.message || 'AI error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper p="md" radius={12} withBorder style={{ marginBottom: 24 }}>
            <Group align="flex-end" gap="md">
                <Textarea
                    label="Ask AI"
                    placeholder="Type your question or request..."
                    value={prompt}
                    onChange={e => setPrompt(e.currentTarget.value)}
                    minRows={2}
                    style={{ flex: 1 }}
                    disabled={loading}
                />
                <Button onClick={handleAsk} loading={loading} disabled={!prompt.trim()} style={{ height: 40 }}>
                    Ask
                </Button>
            </Group>
            {loading && <Loader size="sm" mt={8} />}
            {error && <Text c="red" mt={8}>{error}</Text>}
            {response && <Paper p="sm" mt={8} radius={8} style={{ background: '#f5f7fa' }}><Text>{response}</Text></Paper>}
        </Paper>
    );
} 