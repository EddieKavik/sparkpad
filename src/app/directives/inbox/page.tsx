"use client";
import { useEffect, useState } from "react";
import {
  Table,
  Loader,
  Text,
  Modal,
  Button,
  Group,
  Stack,
  Title,
  Notification,
  TextInput,
  Checkbox,
  Badge,
  Select,
} from "@mantine/core";
import ReactMarkdown from "react-markdown";

interface UserReceivedDirective {
  id: string;
  user_id: string;
  directive_id: string;
  received_at?: string;
  read_status?: boolean;
  // Optionally, you can add more fields if present
}

interface Directive {
  id: string;
  title: string;
  category: string[];
  issuing_body: string;
  source_language: string;
  keywords: string[];
  issue_date: string | Date;
  status: string;
  content: string;
  [key: string]: unknown;
}

export default function InboxPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userDirectives, setUserDirectives] = useState<UserReceivedDirective[]>([]);
  const [directives, setDirectives] = useState<Record<string, Directive>>({});
  const [selectedDirective, setSelectedDirective] = useState<Directive | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch user received directives
  useEffect(() => {
    const fetchInbox = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/directives-inbox");
        if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch inbox");
        const data = await res.json();
        setUserDirectives(Array.isArray(data) ? data : []);
        // Fetch all unique directive details
        const ids = Array.from(new Set((data || []).map((d: any) => d.directive_id)));
        const directivesObj: Record<string, Directive> = {};
        await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/directives/${id}`);
            if (res.ok) {
              const dir = await res.json();
              directivesObj[id] = dir;
            }
          })
        );
        setDirectives(directivesObj);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  const handleRowClick = (directiveId: string) => {
    const dir = directives[directiveId];
    if (dir) {
      setSelectedDirective(dir);
      setModalOpen(true);
    }
  };

  // Mark as read/unread
  const toggleReadStatus = async (ud: UserReceivedDirective) => {
    setUpdating(ud.id);
    try {
      const res = await fetch("/api/directives-inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ud.id, read: !ud.read_status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      setUserDirectives((prev) =>
        prev.map((d) => (d.id === ud.id ? { ...d, read_status: !ud.read_status } : d))
      );
    } catch (e) {
      // Optionally show error
    } finally {
      setUpdating(null);
    }
  };

  // Filtered and searched directives
  const filtered = userDirectives.filter((ud) => {
    const dir = directives[ud.directive_id as keyof typeof directives] as Directive;
    if (!dir) return false;
    if (showUnreadOnly && ud.read_status) return false;
    if (statusFilter && dir.status !== statusFilter) return false;
    if (search && !dir.title.toLowerCase().includes(search.toLowerCase()) && !dir.issuing_body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const statusOptions = Array.from(new Set(Object.values(directives).map((d) => (d as Directive).status))).map((s) => ({ value: s, label: s }));

  return (
    <Stack>
      <Title order={2} mb="lg">Inbox</Title>
      <Group mb="sm">
        <TextInput
          placeholder="Search by title or issuing body"
          value={search}
          onChange={e => setSearch(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Checkbox
          label="Unread only"
          checked={showUnreadOnly}
          onChange={e => setShowUnreadOnly(e.currentTarget.checked)}
        />
        <Select
          placeholder="Filter by status"
          data={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
        />
      </Group>
      {loading ? (
        <Loader />
      ) : error ? (
        <Notification color="red">{error}</Notification>
      ) : filtered.length === 0 ? (
        <Text color="dimmed">No directives found.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Issuing Body</th>
              <th>Issue Date</th>
              <th>Read</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ud) => {
              const dir = directives[ud.directive_id];
              if (!dir) return null;
              return (
                <tr key={ud.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(ud.directive_id)}>
                  <td>{dir.title}</td>
                  <td>{dir.status}</td>
                  <td>{dir.issuing_body}</td>
                  <td>{dir.issue_date ? new Date(dir.issue_date as string).toLocaleDateString() : ""}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <Badge color={ud.read_status ? "gray" : "blue"}>{ud.read_status ? "Read" : "Unread"}</Badge>
                    <Button
                      size="xs"
                      variant="subtle"
                      loading={updating === ud.id}
                      onClick={e => { e.stopPropagation(); toggleReadStatus(ud); }}
                      ml={6}
                    >
                      Mark as {ud.read_status ? "Unread" : "Read"}
                    </Button>
                  </td>
                  <td>
                    <Button size="xs" onClick={e => { e.stopPropagation(); handleRowClick(ud.directive_id); }}>
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Directive Details" centered>
        {selectedDirective && (
          <Stack>
            <Title order={4}>{selectedDirective.title}</Title>
            <Text size="sm" color="dimmed">Status: {selectedDirective.status}</Text>
            <Text size="sm" color="dimmed">Issuing Body: {selectedDirective.issuing_body}</Text>
            <Text size="sm" color="dimmed">Issue Date: {selectedDirective.issue_date ? new Date(selectedDirective.issue_date as string).toLocaleDateString() : ""}</Text>
            <Text size="sm" color="dimmed">Categories: {selectedDirective.category.join(", ")}</Text>
            <Text size="sm" color="dimmed">Keywords: {selectedDirective.keywords.join(", ")}</Text>
            <Text size="sm" color="dimmed">Source Language: {selectedDirective.source_language}</Text>
            <Text size="sm" mt="xs">Content:</Text>
            <div style={{ border: '1px solid #eee', borderRadius: 4, padding: 8, minHeight: 40 }}>
              <ReactMarkdown>{selectedDirective.content}</ReactMarkdown>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
} 