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

type Props = NativeStackScreenProps<RootStackParamList, "Tables">;

export default function TablesScreen({ navigation }: Props) {
  const { token, signOut } = useAuth();

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
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Mes tables</Text>
        <Pressable onPress={signOut}>
          <Text>Logout</Text>
        </Pressable>
      </View>

      {/* Bloc création */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => setShowCreate((v) => !v)}>
          <Text style={{ color: "#0066cc", fontWeight: "600" }}>
            {showCreate ? "− Annuler" : "+ Créer une table"}
          </Text>
        </Pressable>

        {showCreate && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: "#fff",
              borderRadius: 12,
              elevation: 1,
              gap: 8,
            }}
          >
            <Input placeholder="Nom de la table *" value={name} onChangeText={setName} />
            <Input
              placeholder="Description (optionnel)"
              value={description}
              onChangeText={setDescription}
            />
            <Button title={creating ? "Création..." : "Créer"} onPress={onCreate} disabled={creating} />
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
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          data={tables}
          keyExtractor={(t) => String(t.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("TableDetail", { id: item.id })}
              style={{
                padding: 16,
                backgroundColor: "#fff",
                borderRadius: 12,
                marginBottom: 12,
                elevation: 2,
              }}
            >
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>{item.name}</Text>
              {!!item.description && (
                <Text style={{ color: "#555", marginTop: 4 }}>{item.description}</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 32 }}>Aucune table.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
