import React, { useState } from "react";
import { Alert, SafeAreaView, Text, View, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../lib/auth";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const theme = {
  colors: {
    bg: "#F6F7FB",
    surface: "#FFFFFF",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    primary: "#6C5CE7",
    primaryDark: "#5948E0",
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

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signUp } = useAuth();

  const [modeRegister, setModeRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    try {
      setBusy(true);

      const u = username.trim();
      if (!u || !password) {
        Alert.alert("Champs requis", "Renseigne ton nom d’utilisateur et ton mot de passe.");
        return;
      }

      if (modeRegister) {
        if (password.length < 8) {
          Alert.alert("Mot de passe trop court", "Minimum 8 caractères.");
          return;
        }
        if (password !== confirm) {
          Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
          return;
        }
        await signUp(u, password, confirm);
      } else {
        await signIn(u, password);
      }

      navigation.replace("Tables");
    } catch (e: any) {
      const msg = e?.message || (modeRegister ? "Inscription impossible" : "Connexion impossible");
      Alert.alert("Erreur", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing(6),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Brand */}
        <View style={{ alignItems: "center", marginBottom: theme.spacing(6) }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>🎲 Boardgame Social</Text>
          <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
            {modeRegister ? "Crée ton compte" : "Heureux de te revoir !"}
          </Text>
        </View>

        {/* Card */}
        <View
          style={{
            width: "100%",
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.m,
            padding: theme.spacing(5),
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadow.style,
            gap: theme.spacing(3),
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text, marginBottom: theme.spacing(1) }}>
            {modeRegister ? "Inscription" : "Connexion"}
          </Text>

          <Input
            placeholder="Nom d'utilisateur"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <Input
            placeholder="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {modeRegister && (
            <Input
              placeholder="Confirmer le mot de passe"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
          )}

          <Button
            variant="primary"
            title={
              busy
                ? modeRegister
                  ? "Inscription..."
                  : "Connexion..."
                : modeRegister
                ? "Créer mon compte"
                : "Se connecter"
            }
            onPress={onSubmit}
            disabled={busy}
          />

          <View style={{ alignItems: "center", marginTop: theme.spacing(1) }}>
            <Pressable onPress={() => setModeRegister((v) => !v)} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                {modeRegister ? "J'ai déjà un compte — Me connecter" : "Créer un compte"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer hint */}
        <View style={{ marginTop: theme.spacing(4) }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "center" }}>
            En continuant, tu acceptes les règles de bonne conduite de la communauté.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
