// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import Input from "../components/Input";
import Button from "../components/Button";

const theme = {
  colors: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    primary: "#6C5CE7",
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

export default function ProfileScreen() {
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [favoriteGames, setFavoriteGames] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const res = await api.getMyProfile(token);
        setCity(res.user.city || "");
        setFavoriteGames(res.user.favoriteGames || "");
        setDescription(res.user.description || "");
      } catch (e: any) {
        Alert.alert("Erreur", e?.message || "Chargement impossible");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function save() {
    if (!token) return;
    try {
      setSaving(true);
      await api.updateMyProfile(token, {
        city: city.trim() || undefined,
        favoriteGames: favoriteGames.trim() || undefined,
        description: description.trim() || undefined,
      });
      Alert.alert("OK", "Profil mis à jour.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
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
        <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}>👤 Mon profil</Text>
        <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
          Utilisateur : <Text style={{ fontWeight: "700", color: theme.colors.text }}>{user?.username}</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing(4),
          paddingBottom: theme.spacing(6),
          gap: theme.spacing(3),
        }}
      >
        {/* Card: Infos publiques */}
        <View
          style={{
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
            Informations publiques
          </Text>

          <View>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>Ville</Text>
            <Input placeholder="Ville" value={city} onChangeText={setCity} />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>
              Jeux préférés
            </Text>
            <Input placeholder="Ex: Catan, Azul, 7 Wonders" value={favoriteGames} onChangeText={setFavoriteGames} />
          </View>

          <View>
            <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>
              Description
            </Text>
            <Input placeholder="Dis-en un peu plus sur toi..." value={description} onChangeText={setDescription} multiline />
          </View>

          <View style={{ height: theme.spacing(1) }} />
          <Button variant="primary" title={saving ? "Enregistrement..." : "Enregistrer"} onPress={save} />
        </View>

        {/* Tip */}
        <Text style={{ color: theme.colors.muted, textAlign: "center", fontSize: 12 }}>
          Ces informations aident les autres joueurs à te trouver par ville et affinités.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
