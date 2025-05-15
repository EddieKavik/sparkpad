"use client";
import { useState } from "react";
import { Title, Text, Paper, Group, TextInput, Button, Stack, MultiSelect, Box, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { IconRobot, IconSparkles, IconBulb, IconFile, IconPlus, IconSearch, IconTag, IconWand, IconMessage2 } from "@tabler/icons-react";
import { NavigationBar } from "@/components/NavigationBar";

const demoTags = ["AI", "Web", "PDF", "Note", "Research", "Summary", "Data"];

export default function ResearchPage() {
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiAnswer, setAiAnswer] = useState("");
    const [researchItems, setResearchItems] = useState([
        { id: 1, title: "AI in Healthcare", type: "Web", tags: ["AI", "Healthcare"], content: "A review of AI applications in healthcare.", summary: "AI is revolutionizing healthcare by enabling faster diagnosis and personalized treatment." },
        { id: 2, title: "Quantum Computing 101", type: "PDF", tags: ["Quantum", "Computing"], content: "Introductory concepts in quantum computing.", summary: "Quantum computing leverages quantum mechanics to solve complex problems much faster than classical computers." },
    ]);
    const [newResearch, setNewResearch] = useState({ title: "", type: "", content: "", tags: [] });
    const [adding, setAdding] = useState(false);
    const [tagFilter, setTagFilter] = useState<string[]>([]);

    const handleAskAI = () => {
        setAiAnswer("Here's a smart, AI-generated answer to your research question! (Demo)");
    };

    const handleAddResearch = (e: React.FormEvent) => {
        e.preventDefault();
        setResearchItems([
            { ...newResearch, id: Date.now(), summary: "AI-generated summary coming soon!" },
            ...researchItems,
        ]);
        setNewResearch({ title: "", type: "", content: "", tags: [] });
        setAdding(false);
    };

    return (
        <Box style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181c2b 0%, #23243a 100%)', color: '#fff', padding: '0 0 64px 0' }}>
            <NavigationBar />
            <Box style={{ maxWidth: 900, margin: '0 auto', padding: '48px 0 0 0' }}>
                <Title order={1} style={{ fontSize: 44, fontWeight: 900, letterSpacing: 1, marginBottom: 12, background: 'linear-gradient(90deg, #7f5fff, #40c9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Research Hub <IconSparkles size={36} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
                </Title>
                <Text size="xl" style={{ color: '#b0b7ff', marginBottom: 32, maxWidth: 700 }}>
                    Welcome to your AI-powered research space! Here you can store, organize, and explore research notes, files, and ideas. Ask questions, get instant AI insights, and collaborate with your team. <b>Supercharge your research workflow with smart tools and a beautiful, interactive interface.</b>
                </Text>
                <Paper p="lg" radius="lg" withBorder style={{ background: 'rgba(35,43,77,0.18)', border: '1.5px solid #7f5fff', marginBottom: 32 }}>
                    <Group align="flex-end" gap="md">
                        <TextInput
                            label={<span><IconRobot size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Ask Research AI</span>}
                            placeholder="Type your research question..."
                            value={aiQuestion}
                            onChange={e => setAiQuestion(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Button leftSection={<IconWand size={18} />} onClick={handleAskAI} disabled={!aiQuestion.trim()}>
                            Ask AI
                        </Button>
                    </Group>
                    {aiAnswer && (
                        <Paper mt={16} p="md" radius="md" style={{ background: 'rgba(127,95,255,0.08)', color: '#b0b7ff', marginTop: 16 }}>
                            <Text size="md"><IconMessage2 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {aiAnswer}</Text>
                        </Paper>
                    )}
                </Paper>
                <Paper p="lg" radius="lg" withBorder style={{ background: 'rgba(35,43,77,0.18)', border: '1.5px solid #7f5fff', marginBottom: 32 }}>
                    <Group gap="md" mb={16}>
                        <MultiSelect
                            label={<span><IconTag size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Filter by tags</span>}
                            data={demoTags}
                            value={tagFilter}
                            onChange={setTagFilter}
                            placeholder="Select tags to filter"
                            clearable
                            style={{ minWidth: 220 }}
                        />
                        <Button leftSection={<IconPlus size={16} />} onClick={() => setAdding(a => !a)}>
                            {adding ? "Cancel" : "Add Research"}
                        </Button>
                        <Tooltip label="Search coming soon!"><ActionIcon variant="subtle" color="violet"><IconSearch /></ActionIcon></Tooltip>
                    </Group>
                    {adding && (
                        <form onSubmit={handleAddResearch} style={{ marginBottom: 24 }}>
                            <Group gap="md" align="flex-end">
                                <TextInput
                                    label="Title"
                                    value={newResearch.title}
                                    onChange={e => setNewResearch(r => ({ ...r, title: e.target.value }))}
                                    required
                                    style={{ flex: 2 }}
                                />
                                <TextInput
                                    label="Type"
                                    value={newResearch.type}
                                    onChange={e => setNewResearch(r => ({ ...r, type: e.target.value }))}
                                    style={{ flex: 1 }}
                                    placeholder="web, note, pdf, ..."
                                />
                                <TextInput
                                    label="Content"
                                    value={newResearch.content}
                                    onChange={e => setNewResearch(r => ({ ...r, content: e.target.value }))}
                                    required
                                    style={{ flex: 3 }}
                                />
                                <MultiSelect
                                    label="Tags"
                                    data={demoTags}
                                    value={newResearch.tags as string[]}
                                    onChange={tags => setNewResearch(r => ({ ...r, tags }))}
                                    searchable
                                    style={{ flex: 2 }}
                                />
                                <Button type="submit">Add</Button>
                            </Group>
                        </form>
                    )}
                    <Stack>
                        {researchItems.filter(item => tagFilter.length === 0 || (item.tags || []).some((tag: string) => tagFilter.includes(tag))).length === 0 ? (
                            <Text c="dimmed">No research items match the selected tags.</Text>
                        ) : (
                            researchItems.filter(item => tagFilter.length === 0 || (item.tags || []).some((tag: string) => tagFilter.includes(tag))).map(item => (
                                <Paper key={item.id} withBorder p="md" radius="md" style={{ background: 'rgba(24,28,43,0.85)', border: '1.5px solid #3a2e5d77', color: '#fff', marginBottom: 8 }}>
                                    <Group justify="space-between" align="center">
                                        <Group align="center" gap={8} style={{ flex: 1 }}>
                                            <Text fw={700}>{item.title}</Text>
                                            <Text size="sm" c="#b0b7ff">{item.type}</Text>
                                            {item.tags && item.tags.length > 0 && (
                                                <Group gap="xs">
                                                    {item.tags.map((tag: string) => (
                                                        <Badge key={tag} color="violet" variant="light">{tag}</Badge>
                                                    ))}
                                                </Group>
                                            )}
                                        </Group>
                                        <IconFile size={20} color="#7f5fff" />
                                    </Group>
                                    <Box mt={8} mb={8}><Text size="sm">{item.content}</Text></Box>
                                    <Paper p="sm" mt={8} radius="md" style={{ background: 'rgba(127,95,255,0.08)', color: '#b0b7ff' }}>
                                        <Group gap={6} align="center">
                                            <IconRobot size={16} color="#7f5fff" />
                                            <Text size="xs" fw={700} c="#7f5fff">AI Summary</Text>
                                        </Group>
                                        <Text size="sm">{item.summary}</Text>
                                    </Paper>
                                </Paper>
                            ))
                        )}
                    </Stack>
                </Paper>
                <Paper p="lg" radius="lg" withBorder style={{ background: 'rgba(35,43,77,0.18)', border: '1.5px solid #7f5fff' }}>
                    <Group gap="md" align="flex-start">
                        <IconBulb size={32} color="#7f5fff" />
                        <Box>
                            <Title order={4} style={{ color: '#7f5fff', marginBottom: 8 }}>AI-Powered Research Tips</Title>
                            <Text size="md" style={{ color: '#b0b7ff' }}>
                                • Use the AI assistant to summarize long articles or papers.<br />
                                • Tag your research for easy filtering and discovery.<br />
                                • Collaborate by sharing research notes and insights.<br />
                                • More smart features coming soon!
                            </Text>
                        </Box>
                    </Group>
                </Paper>
            </Box>
        </Box>
    );
} 