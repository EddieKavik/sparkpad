"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container, Title, Tabs, Box, Text, Loader, Center } from "@mantine/core";

export default function ProjectViewPage() {
    const params = useParams();
    const projectId = params?.projectId;
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            try {
                const res = await fetch("http://localhost:3333/projects?mode=volatile&key=projects");
                if (!res.ok) throw new Error("Failed to fetch projects");
                const data = await res.json();
                if (Array.isArray(data)) {
                    const found = data.find((p) => String(p.id) === String(projectId));
                    setProject(found || null);
                } else {
                    setProject(null);
                }
            } catch {
                setProject(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    if (loading) {
        return (
            <Center style={{ minHeight: 200 }}>
                <Loader />
            </Center>
        );
    }

    if (!project) {
        return (
            <Container size="md" mt={40}>
                <Title order={2} mb="lg" c="red">
                    Project not found
                </Title>
                <Text c="dimmed">The project you are looking for does not exist.</Text>
            </Container>
        );
    }

    return (
        <Container size="md" mt={40}>
            <Title order={2} mb="lg">
                Project: {project.name || projectId}
            </Title>
            <Tabs defaultValue="documents">
                <Tabs.List>
                    <Tabs.Tab value="documents">Documents</Tabs.Tab>
                    <Tabs.Tab value="templates">Templates</Tabs.Tab>
                    <Tabs.Tab value="members">Members</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="documents" pt="md">
                    <Box>
                        <Text c="dimmed">Documents tab content coming soon!</Text>
                    </Box>
                </Tabs.Panel>
                <Tabs.Panel value="templates" pt="md">
                    <Box>
                        <Text c="dimmed">Templates tab content coming soon!</Text>
                    </Box>
                </Tabs.Panel>
                <Tabs.Panel value="members" pt="md">
                    <Box>
                        <Text c="dimmed">Members tab content coming soon!</Text>
                    </Box>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
} 