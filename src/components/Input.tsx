import React from "react";
import { TextInput, TextInputProps, Platform } from "react-native";

export default function Input(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: "#ddd",
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "ios" ? 12 : 10,
          borderRadius: 12,
          backgroundColor: "white",
        },
        props.style,
      ]}
      placeholderTextColor="#888"
    />
  );
}
