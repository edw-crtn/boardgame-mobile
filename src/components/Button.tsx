import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
}: Props) {
  const bg =
    variant === "danger" ? "#d32f2f" : variant === "secondary" ? "#ffffff" : "#1976d2"; // bleu
  const color = variant === "secondary" ? "#111111" : "#ffffff";
  const borderColor = variant === "secondary" ? "#dddddd" : "transparent";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.6 : 1,
        backgroundColor: bg,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor,
        ...(style || {}),
      }}
    >
      <Text style={{ textAlign: "center", fontWeight: "700", color }}>{title}</Text>
    </Pressable>
  );
}
