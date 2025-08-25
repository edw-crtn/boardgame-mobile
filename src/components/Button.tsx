import React from "react";
import { Pressable, Text } from "react-native";

export default function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? "#bbb" : "#111",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ color: "white", fontWeight: "bold" }}>{title}</Text>
    </Pressable>
  );
}
