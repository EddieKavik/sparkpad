'use client';
import { useEffect, useRef, useState } from 'react';
import { ActionIcon, Avatar, Box, Button, Group, Loader, Paper, Stack, Text, TextInput, rem, Transition } from '@mantine/core';
import { IconRobot, IconSend, IconX, IconMessage2 } from '@tabler/icons-react';
import { getGeminiClient } from '@/utils/gemini';

interface FloatingAssistantProps {
  currentTab?: string;
  userName?: string | null;
  /**
   * Optional project context string to make the AI project-aware
   */
  projectContext?: string;
  /**
   * Callback to add a new task from an action item
   */
  onAddTask?: (title: string) => void;
}

const tabSuggestions: Record<string, { greeting: string; actions: { label: string; prompt: string }[] }> = {
  tasks: {
    greeting: 'Need help with your tasks? I can analyze priorities, find bottlenecks, or suggest next steps.',
    actions: [
      { label: 'Analyze Task Health', prompt: 'Analyze my current tasks for bottlenecks, overdue items, and priorities.' },
      { label: 'Suggest Next Steps', prompt: 'Suggest the next best actions for my project tasks.' },
      { label: 'Automate Workflow', prompt: 'How can I automate my task workflow?' },
    ],
  },
  files: {
    greeting: 'Managing files? I can find duplicates, summarize contents, or suggest organization tips.',
    actions: [
      { label: 'Find Duplicates', prompt: 'Check my project files for duplicates or similar files.' },
      { label: 'Summarize Files', prompt: 'Summarize the contents of my uploaded files.' },
      { label: 'Suggest Organization', prompt: 'How should I organize my project files for best practices?' },
    ],
  },
  research: {
    greeting: 'Working on research? I can summarize notes, suggest tags, or answer questions.',
    actions: [
      { label: 'Summarize All Research', prompt: 'Summarize all my research notes for this project.' },
      { label: 'Suggest Tags', prompt: 'Suggest relevant tags for my research items.' },
      { label: 'Answer Research Question', prompt: 'Answer a research question based on my notes.' },
    ],
  },
  chat: {
    greeting: 'Collaborating with your team? I can summarize conversations or suggest next steps.',
    actions: [
      { label: 'Summarize Chat', prompt: 'Summarize the recent project chat for key points and action items.' },
      { label: 'Suggest Next Steps', prompt: 'Based on the chat, what should the team do next?' },
    ],
  },
  members: {
    greeting: 'Managing your team? I can help with onboarding, roles, or team health tips.',
    actions: [
      { label: 'Onboarding Tips', prompt: 'What are best practices for onboarding new team members?' },
      { label: 'Team Health', prompt: 'How can I assess and improve my project team health?' },
    ],
  },
  default: {
    greeting: 'Hi! I can help with project tips, code reviews, or answer any questions you have.',
    actions: [
      { label: 'Project Health Check', prompt: 'Analyze my project for risks, bottlenecks, and improvement opportunities.' },
      { label: 'Suggest Next Steps', prompt: 'What should I focus on next for my project?' },
    ],
  },
};

export default function FloatingAssistant({ currentTab, userName, projectContext, onAddTask }: FloatingAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);

  // Only show if user is logged in
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('user'));
    }
  }, []);

  // Set initial greeting based on context
  useEffect(() => {
    const tab = currentTab && tabSuggestions[currentTab] ? currentTab : 'default';
    setMessages([
      {
        sender: 'ai',
        content: `${userName ? `Hi ${userName}, ` : ''}${tabSuggestions[tab].greeting}`,
      },
    ]);
    setShowSuggestions(true);
  }, [currentTab, userName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading]);

  const sendMessage = async (prompt?: string) => {
    const content = prompt || input;
    if (!content.trim()) return;
    const userMsg = { sender: 'user', content };
    setMessages((msgs: any[]) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);
    try {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      let contextString = messages.map((m) => `${m.sender === 'ai' ? 'AI:' : 'User:'} ${m.content}`).join('\n');
      if (projectContext) contextString = `${projectContext}\n${contextString}`;
      const promptText = `${contextString}\nUser: ${content}\nAI:`;
      const result = await model.generateContent(promptText);
      const aiText = result.response.text().trim();
      setMessages((msgs: any[]) => [...msgs, { sender: 'ai', content: aiText }]);
    } catch (err) {
      setMessages((msgs: any[]) => [
        ...msgs,
        { sender: 'ai', content: "Sorry, I couldn't process your request right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Summarize chat handler
  const summarizeChat = async () => {
    setLoading(true);
    setShowSuggestions(false);
    try {
      const lastMessages = messages.slice(-20).map((m) => `${m.sender === 'ai' ? 'AI:' : 'User:'} ${m.content}`).join('\n');
      const prompt = `${projectContext ? projectContext + '\n' : ''}Here are the recent project chat messages:\n${lastMessages}\n\nSummarize this discussion in a few sentences and extract any action items or decisions. Format action items as a bullet list if possible.`;
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const aiText = result.response.text().trim();
      setMessages((msgs: any[]) => [...msgs, { sender: 'ai', content: aiText }]);
      // Parse bullet points for action items
      const bullets = aiText.match(/(?:^|\n)[\-*•]\s+(.+)/gm)?.map(line => line.replace(/^[\-*•]\s+/, '').trim()) || [];
      setActionItems(bullets);
    } catch (err) {
      setMessages((msgs: any[]) => [
        ...msgs,
        { sender: 'ai', content: "Sorry, I couldn't summarize the chat right now." },
      ]);
      setActionItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  const tab = currentTab && tabSuggestions[currentTab] ? currentTab : 'default';
  const suggestions = tabSuggestions[tab].actions;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <Box style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999 }}>
          <ActionIcon
            size={56}
            radius={28}
            color="blue"
            variant="filled"
            onClick={() => setOpen(true)}
            style={{ boxShadow: '0 4px 24px #232b4d22', transition: 'box-shadow 0.2s', animation: loading ? 'assistant-glow 1s infinite alternate' : undefined }}
            title="Open AI Assistant"
          >
            <IconRobot size={32} />
          </ActionIcon>
        </Box>
      )}
      {/* Chat window */}
      {open && (
        <Paper
          shadow="xl"
          radius={24}
          p="md"
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 360,
            maxHeight: 540,
            zIndex: 10000,
            background: '#fff',
            border: '1.5px solid #e3e8ee',
            boxShadow: '0 4px 32px #232b4d33',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Group justify="space-between" align="center" mb={8}>
            <Group gap={8} align="center">
              <Avatar color="blue" radius="xl" style={{ boxShadow: loading ? '0 0 16px 4px #7f5fff55' : undefined, transition: 'box-shadow 0.3s' }}>
                <IconRobot size={20} />
              </Avatar>
              <Text fw={700} size="md">AI Assistant</Text>
            </Group>
            <ActionIcon variant="subtle" color="gray" onClick={() => setOpen(false)} title="Close">
              <IconX size={20} />
            </ActionIcon>
          </Group>
          {/* Action Items Section */}
          {actionItems.length > 0 && (
            <Box mb={8} style={{ background: '#f5f7fa', borderRadius: 8, padding: 8, border: '1px solid #e3e8ee' }}>
              <Text fw={600} size="sm" mb={4} color="blue">Action Items</Text>
              <Stack gap={4}>
                {actionItems.map((item, idx) => (
                  <Group key={idx} gap={6} align="center">
                    <Text size="sm" style={{ flex: 1 }}>{item}</Text>
                    <Button size="xs" variant="light" color="green" style={{ borderRadius: 8 }}
                      onClick={() => onAddTask && onAddTask(item)}
                      disabled={!onAddTask}
                    >
                      Add as Task
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Box>
          )}
          <Stack spacing={4} style={{ flex: 1, overflowY: 'auto', marginBottom: 8 }}>
            {messages.map((msg, idx) => (
              <Group key={idx} align="flex-end" justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}>
                {msg.sender === 'ai' && <Avatar color="blue" radius="xl" size={28}><IconRobot size={16} /></Avatar>}
                <Paper
                  p="xs"
                  radius="md"
                  style={{
                    background: msg.sender === 'ai' ? '#f5f7fa' : '#e0e7ff',
                    color: '#232b4d',
                    maxWidth: 240,
                    fontSize: 14,
                  }}
                >
                  {msg.content}
                </Paper>
                {msg.sender === 'user' && <Avatar color="gray" radius="xl" size={28}><IconMessage2 size={16} /></Avatar>}
              </Group>
            ))}
            {loading && (
              <Group align="center" gap={8} style={{ marginLeft: 8 }}>
                <Loader size={18} color="blue" />
                <Text size="xs" c="dimmed">AI is typing…</Text>
              </Group>
            )}
            <div ref={chatEndRef} />
          </Stack>
          {showSuggestions && suggestions.length > 0 && (
            <Group mb={8} gap={8} style={{ flexWrap: 'wrap' }}>
              {suggestions.map((s, i) => (
                <Button
                  key={i}
                  size="xs"
                  variant="light"
                  color="blue"
                  style={{ borderRadius: 12, fontWeight: 600 }}
                  onClick={() => sendMessage(s.prompt)}
                  disabled={loading}
                >
                  {s.label}
                </Button>
              ))}
            </Group>
          )}
          <Group mt={4} align="flex-end">
            <TextInput
              placeholder="Ask me anything…"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) sendMessage();
              }}
              style={{ flex: 1 }}
              disabled={loading}
            />
            <ActionIcon
              color="blue"
              variant="filled"
              size={36}
              onClick={() => sendMessage()}
              loading={loading}
              disabled={!input.trim() || loading}
              title="Send"
            >
              <IconSend size={20} />
            </ActionIcon>
          </Group>
          <Button mt={8} size="xs" variant="outline" color="blue" fullWidth onClick={summarizeChat} loading={loading} style={{ borderRadius: 12, fontWeight: 600 }}>
            Summarize Chat
          </Button>
        </Paper>
      )}
      <style>{`
        @keyframes assistant-glow {
          from { box-shadow: 0 4px 24px #232b4d22; }
          to { box-shadow: 0 0 32px 8px #7f5fff55; }
        }
      `}</style>
    </>
  );
} 