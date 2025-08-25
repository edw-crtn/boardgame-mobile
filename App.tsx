import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "./src/screens/LoginScreen";
import TablesScreen from "./src/screens/TablesScreen";
import TableDetailScreen from "./src/screens/TableDetailScreen";
import { AuthProvider, useAuth } from "./src/lib/auth";
import PlayerSearchScreen from "./src/screens/PlayerSearchScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

export type RootStackParamList = {
  Login: undefined;
  Tables: undefined;
  TableDetail: { id: number };
  PlayerSearch: { tableId: number };
  Profile: undefined; // <-- NEW
};
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { token } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
        {token ? (
          <>
            <Stack.Screen name="Tables" component={TablesScreen} options={{ title: "Mes tables" }} />
            <Stack.Screen name="TableDetail" component={TableDetailScreen} options={{ title: "Table" }} />
            <Stack.Screen name="PlayerSearch" component={PlayerSearchScreen} options={{ title: "Ajouter des joueurs" }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />

          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Connexion" }} />
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
