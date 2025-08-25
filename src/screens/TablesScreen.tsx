// src/screens/TablesScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Table } from "../lib/types";
import Input from "../components/Input";
import Button from "../components/Button";
import { MaterialIcons } from "@expo/vector-icons";


type Props = NativeStackScreenProps<RootStackParamList, "Tables">;

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

export default function TablesScreen({ navigation }: Props) {
  const { token, signOut, user } = useAuth(); // <-- on récupère aussi 'user' pour savoir si on est owner

  // Liste
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Création
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.listTables(token);
      setTables(res.tables);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await api.listTables(token);
      setTables(res.tables);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Rafraîchissement impossible");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    load();
    return unsubscribe;
  }, [load, navigation]);

  async function onCreate() {
    if (!token) return;
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      Alert.alert("Nom trop court", "Le nom doit contenir au moins 3 caractères.");
      return;
    }
    try {
      setCreating(true);
      await api.createTable(token, trimmed, description.trim() || undefined);
      setName("");
      setDescription("");
      setShowCreate(false);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Création impossible");
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: theme.spacing(4),
          paddingTop: theme.spacing(4),
          paddingBottom: theme.spacing(2),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}>🎲 Mes tables</Text>
          <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
            Retrouve tes groupes et parties
          </Text>
        </View>

        {/* actions droite */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing(3) }}>
          <Pressable
            onPress={() => navigation.navigate("Profile")}
            hitSlop={10}
            accessibilityLabel="Ouvrir le profil"
          >
            <MaterialIcons name="person-outline" size={22} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ScanQR")}
            hitSlop={10}
            accessibilityLabel="Scanner un QR"
          >
            <MaterialIcons name="qr-code-scanner" size={22} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            onPress={signOut}
            hitSlop={10}
            accessibilityLabel="Se déconnecter"
          >
            <MaterialIcons name="logout" size={22} color={theme.colors.danger} />
          </Pressable>
        </View>

      </View>

      {/* Bloc création */}
      <View style={{ paddingHorizontal: theme.spacing(4), paddingBottom: theme.spacing(2) }}>
        <Pressable onPress={() => setShowCreate((v) => !v)} hitSlop={8}>
          <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>
            {showCreate ? "− Annuler" : "+ Créer une table"}
          </Text>
        </Pressable>

        {showCreate && (
          <View
            style={{
              marginTop: theme.spacing(3),
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.m,
              padding: theme.spacing(4),
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadow.style,
              gap: theme.spacing(2),
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing(1) }}>
              Nouvelle table
            </Text>
            <Input placeholder="Nom de la table *" value={name} onChangeText={setName} />
            <Input placeholder="Description (optionnel)" value={description} onChangeText={setDescription} />
            <Button
              variant="primary"
              title={creating ? "Création..." : "Créer"}
              onPress={onCreate}
              disabled={creating}
            />
          </View>
        )}
      </View>

      {/* Liste */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: theme.spacing(4), paddingTop: theme.spacing(2), paddingBottom: theme.spacing(4) }}
          data={tables}
          keyExtractor={(t) => String(t.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const isOwner = item.ownerId === user?.id;
            return (
              <Pressable
                onPress={() => navigation.navigate("TableDetail", { id: item.id })}
                style={{
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing(4),
                  borderRadius: theme.radius.m,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...theme.shadow.style,
                  marginBottom: theme.spacing(3),
                }}
              >
                {/* Ligne titre + action "Inviter via QR" si owner */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing(3) }}>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.text, flex: 1 }}>
                    {item.name}
                  </Text>

                  {isOwner && (
                    <Pressable
                      onPress={() => navigation.navigate("InviteQR", { tableId: item.id })}
                      hitSlop={8}
                      style={{
                        backgroundColor: theme.colors.chip,
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Inviter via QR</Text>
                    </Pressable>
                  )}
                </View>

                {!!item.description && (
                  <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1), lineHeight: 20 }}>
                    {item.description}
                  </Text>
                )}

                {/* (Optionnel) Badges en bas */}
                {/* {isOwner && (
                  <View style={{ marginTop: theme.spacing(2), alignSelf: "flex-start", backgroundColor: theme.colors.chip, borderRadius: theme.radius.pill, paddingVertical: 4, paddingHorizontal: 10 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Owner</Text>
                  </View>
                )} */}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View
              style={{
                alignItems: "center",
                marginTop: theme.spacing(10),
                paddingHorizontal: theme.spacing(6),
                gap: theme.spacing(2),
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>Aucune table</Text>
              <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
                Crée ta première table pour organiser une partie, discuter et planifier des événements.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
