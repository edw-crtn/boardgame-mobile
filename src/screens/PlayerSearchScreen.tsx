// src/screens/PlayerSearchScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import Input from "../components/Input";
import Button from "../components/Button";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerSearch">;

type UserItem = {
  id: number;
  username: string;
  city?: string | null;
  description?: string | null;
};

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
  radius: { s: 10, m: 14, pill: 999 },
  spacing: (n: number) => n * 4,
  shadow: {
    style: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as const,
  },
};

function deriveCitiesFromUsers(users: { city?: string | null }[]) {
  const map = new Map<string, number>();
  for (const u of users) {
    const c = (u.city || "").trim();
    if (!c) continue;
    map.set(c, (map.get(c) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ city, count }));
}

export default function PlayerSearchScreen({ route }: Props) {
  const { token } = useAuth();
  const tableId = route.params.tableId;

  const [q, setQ] = useState("");
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyAdd, setBusyAdd] = useState<number | null>(null);
  const [results, setResults] = useState<UserItem[]>([]);

  // Dropdown state
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const loadCities = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.listPlayerCities(token);
      setCities(res.cities.slice(0, 100));
    } catch (e: any) {
      console.warn(e?.message);
    }
  }, [token]);

  const search = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.searchPlayers(
        token,
        q.trim() || undefined,
        selectedCity || undefined,
        50,
        tableId // exclut owner + membres de la table côté API
      );

      setResults(
        res.users.map((u) => ({
          id: u.id,
          username: u.username,
          city: u.city,
          description: (u as any).description ?? null,
        }))
      );

      // Fallback: si liste des villes vide, dérive depuis les résultats
      if (!cities.length) {
        const derived = deriveCitiesFromUsers(res.users);
        if (derived.length) setCities(derived);
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Recherche impossible");
    } finally {
      setLoading(false);
    }
  }, [token, q, selectedCity, tableId, cities.length]);

  useEffect(() => {
    // charger les villes + première recherche
    loadCities();
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // changement de ville -> relance auto
  useEffect(() => {
    search();
  }, [selectedCity, search]);

  async function add(username: string, userId: number) {
    if (!token) return;
    try {
      setBusyAdd(userId);
      await api.addMember(token, tableId, username);
      // Retire aussitôt de la liste
      setResults((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert("Ajouté", `${username} a été ajouté à la table.`);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Ajout impossible (êtes-vous propriétaire ?)");
    } finally {
      setBusyAdd(null);
    }
  }

  // Groupes par ville pour les résultats
  const sections = useMemo(() => {
    const map = new Map<string, UserItem[]>();
    for (const u of results) {
      const key = (u.city || "—").toString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ title: k, data: map.get(k)! }));
  }, [results]);

  function openCityPicker() {
    loadCities();
    setCityModalOpen(true);
  }

  function pickCity(city: string | null) {
    setSelectedCity(city);
    setCityModalOpen(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(5),
          paddingBottom: theme.spacing(2),
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}>🔎 Recherche de joueurs</Text>
        <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
          Ajoute des joueurs à ta table
        </Text>
      </View>

      {/* Barre de recherche */}
      <View style={{ paddingHorizontal: theme.spacing(4), gap: theme.spacing(2) }}>
        <Input
          placeholder="Rechercher un nom d'utilisateur…"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <View style={{ flexDirection: "row", gap: theme.spacing(2) }}>
          <View style={{ flex: 1 }}>
            <CityDropdown selectedCity={selectedCity} onOpen={openCityPicker} />
          </View>
          <Button variant="primary" title="Rechercher" onPress={search} />
        </View>
      </View>

      {/* Résultats groupés */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingVertical: theme.spacing(4) }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ marginTop: theme.spacing(3), marginBottom: theme.spacing(1) }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted, fontWeight: "700" }}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.m,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadow.style,
                padding: theme.spacing(4),
                marginBottom: theme.spacing(3),
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1, paddingRight: theme.spacing(3) }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(2) }}>
                    <View
                      style={{
                        backgroundColor: theme.colors.chip,
                        borderRadius: theme.radius.pill,
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                        {item.city?.trim() || "—"}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "800", color: theme.colors.text }}>{item.username}</Text>
                  </View>

                  {!!item.description && (
                    <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(2), lineHeight: 20 }}>
                      {item.description}
                    </Text>
                  )}
                </View>

                <Button
                  variant="primary"
                  title={busyAdd === item.id ? "Ajout..." : "Ajouter"}
                  onPress={() => add(item.username, item.id)}
                  disabled={busyAdd === item.id}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: theme.spacing(10), paddingHorizontal: theme.spacing(6) }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>Aucun joueur trouvé</Text>
              <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: theme.spacing(1) }}>
                Essaie un autre nom d’utilisateur ou une autre ville.
              </Text>
            </View>
          }
        />
      )}

      {/* Modal ville */}
      <Modal visible={cityModalOpen} animationType="slide" transparent={false} onRequestClose={() => setCityModalOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surface }}>
          {/* Modal Header */}
          <View style={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(4), paddingBottom: theme.spacing(2), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Choisir une ville</Text>
            <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>Filtrer les joueurs par ville</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing(2) }}>
            {/* Option "Toutes les villes" */}
            <CityOption label="Toutes les villes" active={selectedCity == null} onPress={() => pickCity(null)} />

            {/* Villes */}
            {cities.length === 0 ? (
              <Text style={{ padding: theme.spacing(4), color: theme.colors.muted }}>Aucune ville disponible.</Text>
            ) : (
              cities.map((c) => (
                <CityOption
                  key={c.city}
                  label={`${c.city} (${c.count})`}
                  active={selectedCity === c.city}
                  onPress={() => pickCity(c.city)}
                />
              ))
            )}
          </ScrollView>

          <View style={{ padding: theme.spacing(4), borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <Button title="Fermer" onPress={() => setCityModalOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function CityDropdown({
  selectedCity,
  onOpen,
}: {
  selectedCity: string | null;
  onOpen: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.s,
        paddingHorizontal: theme.spacing(3),
        paddingVertical: theme.spacing(3),
        backgroundColor: theme.colors.surface,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text numberOfLines={1} style={{ color: selectedCity ? theme.colors.text : theme.colors.muted, flex: 1 }}>
        {selectedCity || "Toutes les villes"}
      </Text>
      <Text style={{ color: theme.colors.muted }}>▾</Text>
    </Pressable>
  );
}

function CityOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: theme.spacing(4),
        paddingVertical: theme.spacing(3),
        backgroundColor: active ? "#F3F4FF" : theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontWeight: active ? "800" : "400", color: active ? theme.colors.primary : theme.colors.text }}>
        {label}
      </Text>
      {active ? <Text style={{ color: theme.colors.primary }}>✓</Text> : null}
    </Pressable>
  );
}
