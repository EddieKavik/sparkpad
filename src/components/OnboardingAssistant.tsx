import { useState } from 'react';
import { ActionIcon, Modal, Title, Text, Stack, Button, TextInput, Paper, Group, Divider, rem } from '@mantine/core';
import { IconHelp, IconRobot } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { askAI } from '@/utils/ai';

interface OnboardingAssistantProps {
    context?: string;
}

const quickStartSteps = [
    'Create or select a project to get started.',
    'Add your team members and assign roles.',
    'Create tasks, set deadlines, and track progress.',
    'Upload files and research for your project.',
    'Use SparkChat and AI features for collaboration.',
];

const contextualTips = [
    'Tip: Use the AI Workflow Automation to save time on repetitive tasks.',
    'Tip: Invite your team early for better collaboration.',
    'Tip: Use the calendar to visualize deadlines.',
    'Tip: You can ask the AI for help or suggestions anytime!',
];

export default function OnboardingAssistant({ context }: OnboardingAssistantProps) {
    const [opened, setOpened] = useState(false);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const askAIHandler = async () => {
        if (!question.trim()) return;
        setLoading(true);
        setAnswer('');
        try {
            const userToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!userToken) {
                setAnswer('You must be logged in to use AI features.');
                setLoading(false);
                return;
            }
            const aiAnswer = await askAI(question, userToken);
            setAnswer(aiAnswer);
        } catch (err: any) {
            setAnswer('Failed to get AI answer.');
            showNotification({ title: 'Error', message: err.message || 'Failed to get AI answer.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ActionIcon
                size={56}
                radius="xl"
                color="blue"
                variant="filled"
                style={{
                    position: 'fixed',
                    bottom: rem(100),
                    right: rem(32),
                    zIndex: 2000,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                }}
                onClick={() => setOpened(true)}
                aria-label="Open onboarding assistant"
            >
                <IconHelp size={32} />
            </ActionIcon>
            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={<Group gap={8}><IconHelp color="#1769aa" size={28} /><Title order={4} style={{ color: '#1769aa', fontWeight: 800 }}>Need Help?</Title></Group>}
                centered
                size="lg"
                overlayProps={{ opacity: 0.25, blur: 2 }}
                styles={{
                    content: {
                        borderRadius: 18,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
                        border: '1.5px solid #e3e8ee',
                        background: '#f5f7fa',
                        padding: 32,
                        minWidth: 340,
                        maxWidth: 480,
                    },
                }}
            >
                <Stack gap={20}>
                    <Paper p="md" radius={12} style={{ background: '#fff', border: '1px solid #e3e8ee', boxShadow: '0 2px 8px #1769aa11' }}>
                        <Title order={5} mb={8} style={{ color: '#1769aa' }}>Quick Start Guide</Title>
                        <Stack gap={6}>
                            {quickStartSteps.map((step, i) => (
                                <Group key={i} gap={8} align="flex-start">
                                    <Text fw={700} color="#1769aa">{i + 1}.</Text>
                                    <Text>{step}</Text>
                                </Group>
                            ))}
                            {context && <Text size="sm" c="dimmed" mt={8}>Current context: <b>{context}</b></Text>}
                        </Stack>
                    </Paper>
                    <Paper p="md" radius={12} style={{ background: '#fff', border: '1px solid #e3e8ee', boxShadow: '0 2px 8px #1769aa11' }}>
                        <Title order={5} mb={8} style={{ color: '#1769aa' }}>Ask SparkPad AI</Title>
                        <Group align="flex-end" gap={8}>
                            <TextInput
                                placeholder="Ask a question about SparkPad..."
                                value={question}
                                onChange={e => setQuestion(e.currentTarget.value)}
                                style={{ flex: 1 }}
                                disabled={loading}
                            />
                            <Button leftSection={<IconRobot size={18} />} onClick={askAIHandler} loading={loading} disabled={!question.trim()}>
                                Ask
                            </Button>
                        </Group>
                        {answer && <Text mt={10} style={{ background: '#f5f7fa', borderRadius: 8, padding: 12 }}>{answer}</Text>}
                    </Paper>
                    <Divider my={8} label={<Text size="sm" c="#1769aa">Tips</Text>} labelPosition="center" />
                    <Stack gap={6}>
                        {contextualTips.map((tip, i) => (
                            <Text key={i} size="sm" c="#1769aa">{tip}</Text>
                        ))}
                    </Stack>
                </Stack>
            </Modal>
        </>
    );
} 