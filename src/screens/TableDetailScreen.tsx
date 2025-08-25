import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
  Modal,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { TableDetail } from "../lib/types";
import Input from "../components/Input";
import Button from "../components/Button";
import { fmtDateTime } from "../lib/utils";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

type Props = NativeStackScreenProps<RootStackParamList, "TableDetail">;
type TabKey = "messages" | "polls" | "events";

const theme = {
  colors: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    primary: "#6C5CE7",
    primaryDark: "#5948E0",
    danger: "#E53935",
    chip: "#EEF2FF",
  },
  radius: {
    s: 10,
    m: 14,
    pill: 999,
  },
  shadow: {
    style: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as const,
  },
  spacing: (n: number) => n * 4,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dayStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function timeStr(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TableDetailScreen({ route, navigation }: Props) {
  const tableId = route.params.id;
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>("messages");

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TableDetail | null>(null);

  // Messages
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Ajout rapide par username (via modale)
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  // Votes (multi-choix par sondage)
  const [voteSel, setVoteSel] = useState<Record<number, Set<string>>>({});

  // Créer sondage
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);

  // Ajouter option
  const [addOpt, setAddOpt] = useState<Record<number, string>>({});

  // Créer événement
  const [evCreateDate, setEvCreateDate] = useState<Date>(new Date());
  const [evLoc, setEvLoc] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Édition table (owner)
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Nouvelles modales compact
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  function openEdit() {
    if (!detail) return;
    setEditName(detail.table.name);
    setEditDesc(detail.table.description || "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!token || !detail) return;
    try {
      await api.editTable(token, tableId, editName.trim(), editDesc.trim() || undefined);
      setEditOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Sauvegarde impossible");
    }
  }

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.tableDetail(token, tableId);
      setDetail(res);
      const initSel: Record<number, Set<string>> = {};
      res.polls.forEach((p) => (initSel[p.id] = new Set(p.myVotes || [])));
      setVoteSel(initSel);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [token, tableId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const isOwner = !!detail && user?.id === detail.table.ownerId;
  const listBottomPad = useMemo(
    () => Math.max(insets.bottom, theme.spacing(4)) + (tab === "messages" ? 160 : 40),
    [insets.bottom, tab]
  );

  // Actions messages
  async function sendMessage() {
    if (!token || !msg.trim()) return;
    try {
      setSending(true);
      await api.postMessage(token, tableId, msg.trim());
      setMsg("");
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  // Ajout membre
  async function quickAdd() {
    if (!token || !addName.trim()) return;
    try {
      setAdding(true);
      await api.addMember(token, tableId, addName.trim());
      setAddName("");
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Ajout impossible (êtes-vous propriétaire ?)");
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(memberId: number, username: string) {
    if (!token) return;
    try {
      await api.removeMember(token, tableId, memberId);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || `Impossible de supprimer ${username}`);
    }
  }

  // Votes
  function toggleVote(pollId: number, option: string) {
    setVoteSel((prev) => {
      const next = { ...prev };
      const set = new Set(next[pollId] ?? []);
      if (set.has(option)) set.delete(option);
      else set.add(option);
      next[pollId] = set;
      return next;
    });
  }
  async function submitVote(pollId: number) {
    if (!token) return;
    const sel = Array.from(voteSel[pollId] ?? []);
    if (sel.length === 0) return Alert.alert("Choix requis", "Sélectionne au moins une option.");
    try {
      await api.votePoll(token, tableId, pollId, sel);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Vote impossible");
    }
  }

  // Créer sondage
  async function createPoll() {
    if (!token) return;
    const opts = Array.from(
      new Set(
        pollOpts
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
    if (!pollQ.trim() || opts.length === 0)
      return Alert.alert("Incomplet", "Question et au moins une option.");
    try {
      setCreatingPoll(true);
      await api.createPoll(token, tableId, pollQ.trim(), opts);
      setPollQ("");
      setPollOpts("");
      await load();
      setTab("polls");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Création du sondage impossible");
    } finally {
      setCreatingPoll(false);
    }
  }

  async function addOption(pollId: number) {
    if (!token) return;
    const opt = (addOpt[pollId] || "").trim();
    if (!opt) return;
    try {
      await api.addPollOption(token, tableId, pollId, opt);
      setAddOpt((s) => ({ ...s, [pollId]: "" }));
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Ajout d’option impossible");
    }
  }

  async function deletePoll(pollId: number) {
    if (!token) return;
    try {
      await api.deletePoll(token, tableId, pollId);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Suppression impossible");
    }
  }

  // Events
  const onChangeDate = (_: DateTimePickerEvent, d?: Date) => {
    setShowDatePicker(false);
    if (!d) return;
    setEvCreateDate((prev) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), prev.getHours(), prev.getMinutes()));
  };
  const onChangeTime = (_: DateTimePickerEvent, d?: Date) => {
    setShowTimePicker(false);
    if (!d) return;
    setEvCreateDate((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate(), d.getHours(), d.getMinutes()));
  };

  async function createEvent() {
    if (!token) return;
    try {
      setCreatingEvent(true);
      await api.createEvent(token, tableId, dayStr(evCreateDate), timeStr(evCreateDate), evLoc.trim() || undefined);
      setEvCreateDate(new Date());
      setEvLoc("");
      await load();
      setTab("events");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Création de l’événement impossible");
    } finally {
      setCreatingEvent(false);
    }
  }

  async function editEvent(eventId: number, day: string, time: string, location?: string) {
    if (!token) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
      return Alert.alert("Format invalide", "Jour: YYYY-MM-DD, Heure: HH:MM.");
    }
    try {
      await api.editEvent(token, tableId, eventId, day, time, location);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Modification impossible");
    }
  }

  async function deleteEvent(eventId: number) {
    if (!token) return;
    try {
      await api.deleteEvent(token, tableId, eventId);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Suppression impossible");
    }
  }

  if (loading || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const { table, members, messages, polls, events } = detail;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={[styles.card, { paddingBottom: theme.spacing(4) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.title}>{detail.table.name}</Text>
            {isOwner && (
              <Pressable onPress={openEdit} hitSlop={8}>
                <Text style={styles.link}>Modifier</Text>
              </Pressable>
            )}
          </View>
          {!!detail.table.description && (
            <Text style={styles.description}>{detail.table.description}</Text>
          )}

          {/* Membres (compact) */}
          <View style={{ marginTop: theme.spacing(3) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Membres</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
                {isOwner && (
                  <Pressable onPress={() => navigation.navigate("PlayerSearch", { tableId })} hitSlop={8}>
                    <Text style={styles.link}>Rechercher</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowMembersModal(true)} hitSlop={8}>
                  <Text style={styles.link}>Voir tout</Text>
                </Pressable>
              </View>
            </View>

            <View
              style={{
                marginTop: theme.spacing(2),
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: theme.spacing(2),
              }}
            >
              {members.slice(0, 3).map((m) => (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.chip,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                      {m.username.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ marginLeft: 6, color: theme.colors.text }}>{m.username}</Text>
                </View>
              ))}

              {members.length > 3 && (
                <Pressable onPress={() => setShowMembersModal(true)}>
                  <Text style={{ color: theme.colors.muted }}>+{members.length - 3} autres</Text>
                </Pressable>
              )}

              {isOwner && (
                <Pressable onPress={() => setShowAddMemberModal(true)} style={{ marginLeft: "auto" }}>
                  <Text style={styles.link}>+ Ajouter</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TabBtn label="Messages" active={tab === "messages"} onPress={() => setTab("messages")} />
          <TabBtn label="Sondages" active={tab === "polls"} onPress={() => setTab("polls")} />
          <TabBtn label="Événements" active={tab === "events"} onPress={() => setTab("events")} />
        </View>

        {/* CONTENT */}
        {tab === "messages" && (
          <>
            <FlatList
              contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: listBottomPad }}
              data={messages}
              keyExtractor={(m) => String(m.id)}
              renderItem={({ item }) => {
                const isMe = item.user.id === user?.id;
                return (
                  <View
                    style={{
                      marginBottom: theme.spacing(3),
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleOther,
                        theme.shadow.style,
                      ]}
                    >
                      {!isMe && <Text style={styles.bubbleAuthor}>{item.user.username}</Text>}

                      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                        {item.content}
                      </Text>

                      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                        {fmtDateTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: theme.colors.muted, marginTop: theme.spacing(6) }}>
                  Pas encore de messages.
                </Text>
              }
            />
            {/* Composer */}
            <View
              style={{
                padding: theme.spacing(3),
                paddingBottom: Math.max(insets.bottom, theme.spacing(3)),
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Input
                placeholder="Votre message..."
                value={msg}
                onChangeText={setMsg}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <View style={{ height: theme.spacing(2) }} />
              <Button title={sending ? "Envoi..." : "Envoyer"} onPress={sendMessage} disabled={sending} />
            </View>
          </>
        )}

        {tab === "polls" && (
          <FlatList
            contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: listBottomPad }}
            data={polls}
            keyExtractor={(p) => String(p.id)}
            ListHeaderComponent={
              <View style={[styles.card, { marginBottom: theme.spacing(3) }]}>
                <Text style={styles.sectionTitle}>Créer un sondage</Text>
                <View style={{ height: theme.spacing(2) }} />
                <Input placeholder="Question" value={pollQ} onChangeText={setPollQ} />
                <View style={{ height: theme.spacing(2) }} />
                <Input
                  placeholder={"Options (1 par ligne)\nEx:\n2025-09-12 19:30\n2025-09-13 18:00"}
                  value={pollOpts}
                  onChangeText={setPollOpts}
                  multiline
                />
                <View style={{ height: theme.spacing(2) }} />
                <Button title={creatingPoll ? "Création..." : "Créer"} onPress={createPoll} disabled={creatingPoll} />
              </View>
            }
            renderItem={({ item }) => {
              const total = Object.values(item.results || {}).reduce((a, b) => a + b, 0);
              return (
                <View style={[styles.card, { marginBottom: theme.spacing(3) }]}>
                  <Text style={styles.itemTitle}>{item.question}</Text>
                  <View style={{ height: theme.spacing(1) }} />
                  {item.options.map((opt) => {
                    const count = item.results?.[opt] ?? 0;
                    const pct = total > 0 ? Math.round((count * 100) / total) : 0;
                    const selected = voteSel[item.id]?.has(opt) ?? false;
                    const isMine = (item.myVotes || []).includes(opt);
                    return (
                      <Pressable key={opt} onPress={() => toggleVote(item.id, opt)} style={{ marginBottom: theme.spacing(2) }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(2) }}>
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              borderWidth: 2,
                              borderColor: selected ? theme.colors.primary : "#C7C9D1",
                              backgroundColor: selected ? theme.colors.primary : "transparent",
                            }}
                          />
                          <Text style={{ flex: 1, color: theme.colors.text }}>
                            {opt} {isMine ? "• (mon vote)" : ""}
                          </Text>
                          <Text style={{ color: theme.colors.muted, width: 50, textAlign: "right" }}>{pct}%</Text>
                        </View>
                        <View
                          style={{
                            height: 8,
                            backgroundColor: theme.colors.border,
                            borderRadius: 6,
                            overflow: "hidden",
                            marginTop: theme.spacing(1),
                          }}
                        >
                          <View style={{ height: 8, width: `${pct}%`, backgroundColor: theme.colors.primary }} />
                        </View>
                      </Pressable>
                    );
                  })}
                  <View style={{ height: theme.spacing(2) }} />
                  <Button title="Voter" onPress={() => submitVote(item.id)} />

                  {/* Ajouter une option */}
                  <View style={{ marginTop: theme.spacing(3), gap: theme.spacing(2) }}>
                    <Text style={styles.subLabel}>Ajouter une option</Text>
                    <Input
                      placeholder="Nouvelle option"
                      value={addOpt[item.id] || ""}
                      onChangeText={(t) => setAddOpt((s) => ({ ...s, [item.id]: t }))}
                    />
                    <Button title="Ajouter" onPress={() => addOption(item.id)} />
                  </View>

                  {/* Owner: suppression */}
                  {isOwner && (
                    <View style={{ marginTop: theme.spacing(2) }}>
                      <Button variant="danger" title="Supprimer le sondage" onPress={() => deletePoll(item.id)} />
                    </View>
                  )}

                  {total > 0 ? (
                    <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>{total} vote(s) au total</Text>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        {tab === "events" && (
          <FlatList
            contentContainerStyle={{ padding: theme.spacing(4), paddingBottom: listBottomPad }}
            data={events}
            keyExtractor={(e) => String(e.id)}
            ListHeaderComponent={
              isOwner ? (
                <View style={[styles.card, { marginBottom: theme.spacing(3), gap: theme.spacing(2) }]}>
                  <Text style={styles.sectionTitle}>Créer un événement</Text>

                  {/* date */}
                  <Pressable onPress={() => setShowDatePicker(true)} style={styles.pickerRow}>
                    <View>
                      <Text style={styles.subLabel}>Jour</Text>
                      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{dayStr(evCreateDate)}</Text>
                    </View>
                    <Text style={{ color: theme.colors.muted }}>▾</Text>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker
                      value={evCreateDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={onChangeDate}
                    />
                  )}

                  {/* heure */}
                  <Pressable onPress={() => setShowTimePicker(true)} style={styles.pickerRow}>
                    <View>
                      <Text style={styles.subLabel}>Heure</Text>
                      <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{timeStr(evCreateDate)}</Text>
                    </View>
                    <Text style={{ color: theme.colors.muted }}>▾</Text>
                  </Pressable>
                  {showTimePicker && (
                    <DateTimePicker
                      value={evCreateDate}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      is24Hour
                      onChange={onChangeTime}
                    />
                  )}

                  <Input placeholder="Lieu (optionnel)" value={evLoc} onChangeText={setEvLoc} />
                  <Button
                    variant="primary"
                    title={creatingEvent ? "Création..." : "Créer"}
                    onPress={createEvent}
                    disabled={creatingEvent}
                  />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const [d, t] = String(item.date).split(" ");
              let draftDay = d;
              let draftTime = t;
              let draftLoc = item.location || "";
              return (
                <View style={[styles.card, { marginBottom: theme.spacing(3), gap: theme.spacing(1) }]}>
                  <Text style={styles.itemTitle}>
                    {item.date}
                    {item.location ? ` @ ${item.location}` : ""}
                  </Text>
                  {isOwner ? (
                    <View style={{ gap: theme.spacing(2) }}>
                      <Text style={styles.subLabel}>Modifier cet événement</Text>
                      <Input
                        placeholder="Jour (YYYY-MM-DD)"
                        defaultValue={d}
                        onChangeText={(v) => {
                          draftDay = v;
                          (item as any)._day = v;
                        }}
                      />
                      <Input
                        placeholder="Heure (HH:MM)"
                        defaultValue={t}
                        onChangeText={(v) => {
                          draftTime = v;
                          (item as any)._time = v;
                        }}
                      />
                      <Input
                        placeholder="Lieu (optionnel)"
                        defaultValue={item.location || ""}
                        onChangeText={(v) => {
                          draftLoc = v;
                          (item as any)._loc = v;
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
                        <Button
                          variant="primary"
                          title="Enregistrer"
                          onPress={() =>
                            editEvent(
                              item.id,
                              (item as any)._day || draftDay,
                              (item as any)._time || draftTime,
                              (item as any)._loc ?? draftLoc
                            )
                          }
                        />
                        <Button variant="danger" title="Supprimer" onPress={() => deleteEvent(item.id)} />
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", color: theme.colors.muted, marginTop: theme.spacing(6) }}>
                Aucun événement.
              </Text>
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* MODALE — Liste complète des membres */}
      <Modal visible={showMembersModal} animationType="slide" onRequestClose={() => setShowMembersModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
          <View style={{ padding: theme.spacing(4) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text }}>Membres</Text>
              <Pressable onPress={() => setShowMembersModal(false)} hitSlop={8}>
                <Text style={styles.link}>Fermer</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: theme.spacing(3) }}>
              {members.map((m) => (
                <View
                  key={m.id}
                  style={{
                    paddingVertical: theme.spacing(2),
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: theme.radius.pill,
                        backgroundColor: theme.colors.chip,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                        {m.username.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={{ marginLeft: 8, color: theme.colors.text, fontWeight: "600" }}>{m.username}</Text>
                  </View>

                  {isOwner && m.id !== table.ownerId && (
                    <Pressable onPress={() => removeMember(m.id, m.username)} hitSlop={8}>
                      <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>Supprimer</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODALE — Ajout par nom d’utilisateur */}
      <Modal visible={showAddMemberModal} animationType="slide" onRequestClose={() => setShowAddMemberModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
          <View style={{ padding: theme.spacing(4) }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing(3) }}>
              Ajouter un membre
            </Text>

            <Text style={styles.subLabel}>Nom d’utilisateur</Text>
            <Input placeholder="ex: alice_93" value={addName} onChangeText={setAddName} autoCapitalize="none" />
            <View style={{ height: theme.spacing(2) }} />
            <Button
              title={adding ? "Ajout..." : "Ajouter"}
              onPress={async () => {
                await quickAdd();
                setShowAddMemberModal(false);
              }}
              disabled={adding}
            />

            <View style={{ height: theme.spacing(2) }} />
            <Button variant="secondary" title="Annuler" onPress={() => setShowAddMemberModal(false)} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL ÉDITION TABLE */}
      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
          <View style={{ padding: theme.spacing(4) }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing(3) }}>
              Modifier la table
            </Text>

            <Text style={styles.subLabel}>Nom</Text>
            <Input value={editName} onChangeText={setEditName} />
            <View style={{ height: theme.spacing(2) }} />
            <Text style={styles.subLabel}>Description</Text>
            <Input value={editDesc} onChangeText={setEditDesc} multiline />

            <View style={{ height: theme.spacing(3) }} />
            <Button variant="primary" title="Enregistrer" onPress={saveEdit} />
            <View style={{ height: theme.spacing(2) }} />
            <Button variant="secondary" title="Annuler" onPress={() => setEditOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/** ------- UI bits ------- */

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: theme.spacing(2.5),
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: active ? "#fff" : theme.colors.text,
          fontWeight: "800",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = {
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.m,
    padding: theme.spacing(4),
    marginHorizontal: theme.spacing(4),
    marginTop: theme.spacing(4),
    ...theme.shadow.style,
  },
  title: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: theme.colors.text,
  },
  description: {
    color: theme.colors.muted,
    marginTop: theme.spacing(1),
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: theme.colors.text,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: theme.colors.text,
  },
  subLabel: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: "700" as const,
  },
  tabBar: {
    flexDirection: "row" as const,
    gap: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(1),
  },
  bubble: {
    maxWidth: "90%",
    borderRadius: theme.radius.m,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
  },
  bubbleMe: {
    backgroundColor: theme.colors.primary,
  },
  bubbleOther: {
    backgroundColor: theme.colors.surface,
  },

  bubbleAuthor: {
    color: theme.colors.muted,
    marginBottom: theme.spacing(1),
    fontWeight: "700" as const,
  },

  bubbleText: {},
  bubbleTextOther: {
    color: theme.colors.text,
  },
  bubbleTextMe: {
    color: "#fff",
  },

  bubbleTime: {
    marginTop: theme.spacing(1),
    fontSize: 11,
  },
  bubbleTimeOther: {
    color: theme.colors.muted,
  },
  bubbleTimeMe: {
    color: "rgba(255,255,255,0.8)",
  },
  pickerRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.s,
    padding: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
};
