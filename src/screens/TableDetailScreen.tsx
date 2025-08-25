// src/screens/TableDetailScreen.tsx
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

type Props = NativeStackScreenProps<RootStackParamList, "TableDetail">;

export default function TableDetailScreen({ route }: Props) {
  const tableId = route.params.id;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TableDetail | null>(null);

  // Message composer
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Sélection de votes par sondage (multi-choix)
  // pollId -> Set(options)
  const [voteSel, setVoteSel] = useState<Record<number, Set<string>>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.tableDetail(token, tableId);
      setDetail(res);

      // initialise les sélections avec mes votes existants
      const initSel: Record<number, Set<string>> = {};
      res.polls.forEach((p) => {
        initSel[p.id] = new Set(p.myVotes || []);
      });
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
    if (sel.length === 0) {
      Alert.alert("Choix requis", "Sélectionne au moins une option.");
      return;
    }
    try {
      await api.votePoll(token, tableId, pollId, sel);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Vote impossible");
    }
  }

  const listBottomPad = useMemo(() => Math.max(insets.bottom, 16) + 120, [insets.bottom]);

  if (loading || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const { table, members, messages, polls, events } = detail;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header bloc */}
        <View style={{ padding: 16, backgroundColor: "#fff", elevation: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>{table.name}</Text>
          {table.description ? <Text style={{ color: "#555" }}>{table.description}</Text> : null}
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Membres ({members.length})</Text>
          <Text>{members.map((m) => m.username).join(", ")}</Text>
        </View>

        {/* Contenu scrollable (messages + events + polls) */}
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: listBottomPad }}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: "600", marginBottom: 8 }}>Messages</Text>
              {messages.length === 0 ? (
                <Text style={{ color: "#666" }}>Pas encore de messages.</Text>
              ) : null}

              {/* Events */}
              <Text style={{ fontWeight: "600", marginVertical: 12 }}>Événements ({events.length})</Text>
              {events.length === 0 ? (
                <Text style={{ color: "#666" }}>Aucun événement.</Text>
              ) : (
                events.map((e) => (
                  <Text key={e.id} style={{ marginBottom: 4 }}>
                    • {e.date}
                    {e.location ? ` @ ${e.location}` : ""}
                  </Text>
                ))
              )}

              {/* Polls */}
              <Text style={{ fontWeight: "600", marginVertical: 12 }}>Sondages ({polls.length})</Text>
              {polls.length === 0 ? (
                <Text style={{ color: "#666" }}>Aucun sondage.</Text>
              ) : (
                polls.map((p) => {
                  const total = Object.values(p.results || {}).reduce((a, b) => a + b, 0);
                  return (
                    <View
                      key={p.id}
                      style={{
                        backgroundColor: "#fff",
                        padding: 12,
                        borderRadius: 12,
                        elevation: 1,
                        marginBottom: 12,
                      }}
                    >
                      <Text style={{ fontWeight: "600", marginBottom: 8 }}>{p.question}</Text>

                      {p.options.map((opt) => {
                        const count = p.results?.[opt] ?? 0;
                        const pct = total > 0 ? Math.round((count * 100) / total) : 0;
                        const selected = voteSel[p.id]?.has(opt) ?? false;
                        const isMine = p.myVotes.includes(opt);

                        return (
                          <Pressable
                            key={opt}
                            onPress={() => toggleVote(p.id, opt)}
                            style={{ marginBottom: 8 }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              {/* pseudo-checkbox */}
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 4,
                                  borderWidth: 2,
                                  borderColor: selected ? "#111" : "#aaa",
                                  backgroundColor: selected ? "#111" : "transparent",
                                }}
                              />
                              <Text style={{ flex: 1 }}>
                                {opt} {isMine ? "• (mon vote)" : ""}
                              </Text>
                              <Text style={{ color: "#555", width: 50, textAlign: "right" }}>
                                {pct}%
                              </Text>
                            </View>
                            {/* barre de progression */}
                            <View
                              style={{
                                height: 8,
                                backgroundColor: "#eee",
                                borderRadius: 4,
                                overflow: "hidden",
                                marginTop: 6,
                              }}
                            >
                              <View
                                style={{
                                  height: 8,
                                  width: `${pct}%`,
                                  backgroundColor: "#111",
                                }}
                              />
                            </View>
                          </Pressable>
                        );
                      })}

                      <Button title="Voter" onPress={() => submitVote(p.id)} />
                      {total > 0 ? (
                        <Text style={{ color: "#666", marginTop: 6 }}>{total} vote(s) au total</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text style={{ fontWeight: "600" }}>{item.user.username}</Text>
              <Text>{item.content}</Text>
              <Text style={{ color: "#888", fontSize: 12 }}>{fmtDateTime(item.createdAt)}</Text>
            </View>
          )}
        />

        {/* Composer collé en bas, au-dessus des gestes/navigation */}
        <View
          style={{
            padding: 12,
            paddingBottom: Math.max(insets.bottom, 12),
            borderTopWidth: 1,
            borderTopColor: "#eee",
            backgroundColor: "#fafafa",
          }}
        >
          <Input
            placeholder="Votre message..."
            value={msg}
            onChangeText={setMsg}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <View style={{ height: 8 }} />
          <Button title={sending ? "Envoi..." : "Envoyer"} onPress={sendMessage} disabled={sending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
