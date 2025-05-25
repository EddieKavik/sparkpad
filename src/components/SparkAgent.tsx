"use client";
import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Text, Button, TextInput, Group, Stack, ActionIcon, Avatar, Badge, Tooltip, Modal, Loader } from '@mantine/core';
import { IconRobot, IconSend, IconSparkles, IconBrain, IconMessage, IconX, IconMicrophone, IconMicrophoneOff } from '@tabler/icons-react';
import { showNotification } from '@mantine/notifications';
import { useTheme } from '@/contexts/ThemeContext';

interface Message {
    id: string;
    content: string;
    type: 'user' | 'agent';
    timestamp: Date;
    status?: 'thinking' | 'error' | 'success';
}

interface SparkAgentProps {
    onCommand?: (command: string) => void;
    onTaskComplete?: (taskId: string) => void;
    onProjectUpdate?: (projectId: string) => void;
}

export default function SparkAgent({ onCommand, onTaskComplete, onProjectUpdate }: SparkAgentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    // Initialize agent with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                content: "Hello! I'm your SparkAgent. I can help you with tasks, projects, and more. What would you like to do?",
                type: 'agent',
                timestamp: new Date()
            }]);
        }
    }, [isOpen]);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input,
            type: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        try {
            // Simulate AI processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await processCommand(input);

            const agentMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: response,
                type: 'agent',
                timestamp: new Date(),
                status: 'success'
            };

            setMessages(prev => [...prev, agentMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: "I apologize, but I encountered an error processing your request. Please try again.",
                type: 'agent',
                timestamp: new Date(),
                status: 'error'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const processCommand = async (command: string): Promise<string> => {
        // Convert command to lowercase for easier matching
        const cmd = command.toLowerCase();

        // Basic command processing
        if (cmd.includes('hello') || cmd.includes('hi')) {
            return "Hello! How can I assist you today?";
        }

        if (cmd.includes('help')) {
            return "I can help you with:\n- Creating and managing projects\n- Setting up tasks and deadlines\n- Analyzing project health\n- Providing insights and recommendations\n- Answering questions about your workspace\n\nWhat would you like to do?";
        }

        if (cmd.includes('create project')) {
            onCommand?.('create_project');
            return "I'll help you create a new project. What would you like to name it?";
        }

        if (cmd.includes('show projects')) {
            onCommand?.('show_projects');
            return "I'll fetch your projects for you.";
        }

        if (cmd.includes('task')) {
            onCommand?.('manage_tasks');
            return "I'll help you manage your tasks. Would you like to create, view, or update tasks?";
        }

        // If no specific command is matched
        return "I understand you're asking about: " + command + "\n\nI'm still learning, but I can help you with:\n- Project management\n- Task organization\n- Team collaboration\n- Data analysis\n\nWhat specific aspect would you like to focus on?";
    };

    const toggleListening = () => {
        setIsListening(!isListening);
        // Here you would implement actual voice recognition
        showNotification({
            title: isListening ? 'Voice input disabled' : 'Voice input enabled',
            message: isListening ? 'You can now type your commands' : 'Speak your command',
            color: isListening ? 'blue' : 'green'
        });
    };

    return (
        <>
            {/* Floating Agent Button */}
            <ActionIcon
                size="xl"
                radius="xl"
                variant="filled"
                color="blue"
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
            >
                <IconRobot size={24} />
            </ActionIcon>

            {/* Agent Modal */}
            <Modal
                opened={isOpen}
                onClose={() => setIsOpen(false)}
                size="md"
                title={
                    <Group>
                        <IconSparkles size={24} color="#1769aa" />
                        <Text fw={700} size="lg">SparkAgent</Text>
                        <Badge color="blue" variant="light">AI Assistant</Badge>
                    </Group>
                }
                styles={{
                    title: { flex: 1 },
                    header: { marginBottom: 0 }
                }}
            >
                <Paper
                    style={{
                        height: '60vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: theme === 'dark' ? '#1a1b1e' : '#f8f9fa'
                    }}
                >
                    {/* Messages Area */}
                    <Box
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}
                    >
                        {messages.map((message) => (
                            <Box
                                key={message.id}
                                style={{
                                    alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%'
                                }}
                            >
                                <Group align="flex-start" spacing="xs">
                                    {message.type === 'agent' && (
                                        <Avatar
                                            size="sm"
                                            radius="xl"
                                            color="blue"
                                            style={{ background: '#1769aa' }}
                                        >
                                            <IconRobot size={16} />
                                        </Avatar>
                                    )}
                                    <Paper
                                        p="md"
                                        style={{
                                            background: message.type === 'user' ? '#1769aa' : '#fff',
                                            color: message.type === 'user' ? '#fff' : '#1a1b1e',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                                            {message.content}
                                        </Text>
                                        {message.status === 'thinking' && (
                                            <Loader size="xs" color="blue" mt="xs" />
                                        )}
                                    </Paper>
                                    {message.type === 'user' && (
                                        <Avatar
                                            size="sm"
                                            radius="xl"
                                            color="gray"
                                        >
                                            <IconBrain size={16} />
                                        </Avatar>
                                    )}
                                </Group>
                            </Box>
                        ))}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box
                        p="md"
                        style={{
                            borderTop: '1px solid #e9ecef',
                            background: theme === 'dark' ? '#1a1b1e' : '#fff'
                        }}
                    >
                        <Group spacing="xs">
                            <TextInput
                                placeholder="Type your command..."
                                value={input}
                                onChange={(e) => setInput(e.currentTarget.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                style={{ flex: 1 }}
                                disabled={isProcessing}
                            />
                            <ActionIcon
                                size="lg"
                                variant="light"
                                color={isListening ? 'red' : 'blue'}
                                onClick={toggleListening}
                            >
                                {isListening ? <IconMicrophoneOff size={20} /> : <IconMicrophone size={20} />}
                            </ActionIcon>
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessing}
                                loading={isProcessing}
                            >
                                <IconSend size={20} />
                            </Button>
                        </Group>
                    </Box>
                </Paper>
            </Modal>
        </>
    );
} 