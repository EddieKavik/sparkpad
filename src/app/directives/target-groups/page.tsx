"use client";
import { useEffect, useState } from "react";
import { Table, Loader, Text, Notification, Title, Button, Modal, TextInput, Group } from "@mantine/core";

interface TargetGroup {
  id: string;
  name: string;
  [key: string]: unknown;
}

export default function TargetGroupsPage() {
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/target-groups");
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleAdd = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/target-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add group");
      setModalOpen(false);
      setNewName("");
      fetchGroups();
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title order={2} mb="lg">Target Groups</Title>
      <Button mb="md" onClick={() => setModalOpen(true)}>Add New Group</Button>
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Add Target Group" centered>
        <TextInput
          label="Group Name"
          value={newName}
          onChange={e => setNewName(e.currentTarget.value)}
          placeholder="Enter group name"
        />
        {saveError && <Notification color="red" mt="sm">{saveError}</Notification>}
        <Group mt="md">
          <Button loading={saving} onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
          <Button variant="light" onClick={() => setModalOpen(false)}>Cancel</Button>
        </Group>
      </Modal>
      {loading ? (
        <Loader />
      ) : error ? (
        <Notification color="red">{error}</Notification>
      ) : groups.length === 0 ? (
        <Text color="dimmed">No target groups found.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.id}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
} 