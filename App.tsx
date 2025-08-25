// App.tsx
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./src/lib/auth";

import LoginScreen from "./src/screens/LoginScreen";
import TablesScreen from "./src/screens/TablesScreen";
import TableDetailScreen from "./src/screens/TableDetailScreen";
import PlayerSearchScreen from "./src/screens/PlayerSearchScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import InviteQRScreen from "./src/screens/InviteQRScreen";
import ScanQRScreen from "./src/screens/ScanQRScreen";

export type RootStackParamList = {
  Login: undefined;
  Tables: undefined;
  TableDetail: { id: number };
  PlayerSearch: { tableId: number };
  Profile: undefined;
  InviteQR: { tableId: number };
  ScanQR: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { token } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        {token ? (
          <>
            <Stack.Screen name="Tables" component={TablesScreen} options={{ title: "Mes tables" }} />
            <Stack.Screen name="TableDetail" component={TableDetailScreen} options={{ title: "Table" }} />
            <Stack.Screen name="PlayerSearch" component={PlayerSearchScreen} options={{ title: "Recherche de joueurs" }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
            <Stack.Screen name="InviteQR" component={InviteQRScreen} options={{ title: "Inviter via QR" }} />
            <Stack.Screen name="ScanQR" component={ScanQRScreen} options={{ title: "Scanner un QR" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
