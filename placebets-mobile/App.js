import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import OddsScreen from './src/screens/OddsScreen';
import PicksScreen from './src/screens/PicksScreen';
import ParlayScreen from './src/screens/ParlayScreen';
import TrackerScreen from './src/screens/TrackerScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: '#0D0D0D',
  card: '#1A1A2E',
  accent: '#00E676',
  muted: '#6B7280',
  text: '#FFFFFF',
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: '#2A2A3E',
            borderTopWidth: 1,
            height: 85,
            paddingTop: 8,
            paddingBottom: 28,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.muted,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Odds':
                iconName = focused ? 'flash' : 'flash-outline';
                break;
              case 'Picks':
                iconName = focused ? 'sparkles' : 'sparkles-outline';
                break;
              case 'Parlay':
                iconName = focused ? 'calculator' : 'calculator-outline';
                break;
              case 'Tracker':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Odds" component={OddsScreen} />
        <Tab.Screen name="Picks" component={PicksScreen} />
        <Tab.Screen name="Parlay" component={ParlayScreen} />
        <Tab.Screen name="Tracker" component={TrackerScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
