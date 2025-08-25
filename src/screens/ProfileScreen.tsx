// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  View,
} from "react-native";
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
      if (!token) {
        setLoading(false);
        return;
      }
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
    // ✅ Vérifie d’abord que le tap arrive bien ici
    Alert.alert("Tap OK", "Le bouton a bien été pressé.");
    if (!token) return;
    try {
      setSaving(true);
      Keyboard.dismiss();
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: theme.spacing(4),
            paddingTop: theme.spacing(5),
            paddingBottom: theme.spacing(2),
          }}
          // S'assure que ce header ne bloque pas les touchs en dessous
          pointerEvents="box-none"
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: theme.colors.text }}>👤 Mon profil</Text>
          <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
            Utilisateur : <Text style={{ fontWeight: "700", color: theme.colors.text }}>{user?.username}</Text>
          </Text>
        </View>

        {/* Contenu sans ScrollView */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing(4),
            paddingBottom: theme.spacing(4),
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.m,
              padding: theme.spacing(4),
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadow.style,
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing(3) }}
            >
              Informations publiques
            </Text>

            <View style={{ marginBottom: theme.spacing(3) }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>Ville</Text>
              <Input placeholder="Ville" value={city} onChangeText={setCity} />
            </View>

            <View style={{ marginBottom: theme.spacing(3) }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>
                Jeux préférés
              </Text>
              <Input
                placeholder="Ex: Catan, Azul, 7 Wonders"
                value={favoriteGames}
                onChangeText={setFavoriteGames}
              />
            </View>

            <View style={{ marginBottom: theme.spacing(3) }}>
              <Text style={{ fontSize: 12, color: theme.colors.muted, marginBottom: theme.spacing(1) }}>
                Description
              </Text>
              <Input
                placeholder="Dis-en un peu plus sur toi..."
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {/* Bouton — zIndex pour éviter qu’un overlay capte le touch */}
            <Button
              variant="primary"
              title={saving ? "Enregistrement..." : "Enregistrer"}
              onPress={save}
              disabled={saving}
              style={{ zIndex: 1 }}
            />
          </View>

          <Text style={{ color: theme.colors.muted, textAlign: "center", fontSize: 12, marginTop: theme.spacing(3) }}>
            Ces informations aident les autres joueurs à te trouver par ville et affinités.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
