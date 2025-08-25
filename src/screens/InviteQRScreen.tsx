import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import QRCode from "react-native-qrcode-svg";

type Props = NativeStackScreenProps<RootStackParamList, "InviteQR">;

const theme = {
  colors: { bg: "#F6F7FB", surface: "#fff", text: "#111827", muted: "#6B7280", border: "#E5E7EB" },
  radius: { m: 14 },
  spacing: (n: number) => n * 4,
  shadow: {
    style: {
      shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 }, elevation: 2,
    } as const,
  },
};

export default function InviteQRScreen({ route }: Props) {
  const tableId = route.params.tableId;
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const res = await api.createInviteToken(token, tableId);
        // on encode un préfixe pour reconnaître au scan
        setQr(`INVITE:${res.token}`);
        setExpiresAt(res.expiresAt);
      } catch (e: any) {
        Alert.alert("Erreur", e?.message || "Impossible de créer l’invitation.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, tableId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: "88%", backgroundColor: theme.colors.surface, borderRadius: theme.radius.m,
          padding: theme.spacing(6), borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.style,
          alignItems: "center", gap: theme.spacing(3),
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>Inviter via QR</Text>
        {loading ? (
          <ActivityIndicator />
        ) : qr ? (
          <>
            <QRCode value={qr} size={220} />
            {expiresAt && (
              <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
                Valide jusqu’au {new Date(expiresAt).toLocaleString()}
              </Text>
            )}
            <Text style={{ color: theme.colors.muted, textAlign: "center" }}>
              Demande à ton ami d’ouvrir “Scanner un QR” dans l’app et de scanner ce code.
            </Text>
          </>
        ) : (
          <Text style={{ color: theme.colors.muted }}>Aucun QR disponible.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
