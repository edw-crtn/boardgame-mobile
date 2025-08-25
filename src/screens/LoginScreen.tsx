import React, { useState } from "react";
import { Alert, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../lib/auth";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    try {
      setBusy(true);
      await signIn(username.trim(), password);
      navigation.replace("Tables");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", textAlign: "center" }}>Boardgame — Connexion</Text>
        <Input placeholder="Nom d'utilisateur" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <Input placeholder="Mot de passe" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title={busy ? "Connexion..." : "Se connecter"} onPress={onSubmit} disabled={busy} />
      </View>
    </SafeAreaView>
  );
}
