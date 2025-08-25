// src/screens/ScanQRScreen.tsx
import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { CameraView, useCameraPermissions } from "expo-camera";

type Props = NativeStackScreenProps<RootStackParamList, "ScanQR">;

const theme = {
  colors: { bg: "#000", overlay: "rgba(0,0,0,0.35)", text: "#fff", btn: "#6C5CE7" },
};

function extractToken(data: string): string | null {
  if (!data) return null;
  if (data.startsWith("INVITE:")) return data.slice("INVITE:".length);
  const m = data.match(/[?&]token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : data;
}

export default function ScanQRScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Demande d’accès à la caméra…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          L’app a besoin de la caméra pour scanner un QR.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ backgroundColor: theme.colors.btn, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Autoriser la caméra</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function onScan(result: any) {
    if (scanned) return;
    setScanned(true);
    const data = String(result?.data || "");
    const invite = extractToken(data);
    if (!invite) {
      Alert.alert("Erreur", "QR invalide.", [{ text: "OK", onPress: () => setScanned(false) }]);
      return;
    }
    try {
      const res = await api.redeemInvite(token!, invite);
      Alert.alert("OK", res.joined ? "Tu as rejoint la table !" : "Tu faisais déjà partie de la table.", [
        { text: "Ouvrir la table", onPress: () => navigation.replace("TableDetail", { id: res.tableId }) },
        { text: "Fermer", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d’utiliser l’invitation.", [
        { text: "Réessayer", onPress: () => setScanned(false) },
        { text: "Fermer", onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : onScan}
      />
      {/* overlay header */}
      <SafeAreaView
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, padding: 16 }}
      >
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 18 }}>Scanner un QR</Text>
        <Text style={{ color: theme.colors.text, opacity: 0.85, marginTop: 6 }}>
          Aligne le code dans le cadre.
        </Text>
      </SafeAreaView>
    </View>
  );
}
