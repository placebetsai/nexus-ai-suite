import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import PathsScreen from './screens/PathsScreen';
import LessonsScreen from './screens/LessonsScreen';
import ProgressScreen from './screens/ProgressScreen';
import ROIScreen from './screens/ROIScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: '#0a0a0f',
  card: '#12121a',
  neonPink: '#ff2d7b',
  neonCyan: '#00f0ff',
  neonGreen: '#39ff14',
  neonPurple: '#bf00ff',
  neonYellow: '#ffe600',
  text: '#e0e0e0',
  textDim: '#6b6b8d',
};

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.neonPink,
            borderTopWidth: 1,
            height: 70,
            paddingBottom: 10,
            paddingTop: 5,
          },
          tabBarActiveTintColor: COLORS.neonCyan,
          tabBarInactiveTintColor: COLORS.textDim,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Paths') iconName = focused ? 'map' : 'map-outline';
            else if (route.name === 'Lessons') iconName = focused ? 'book' : 'book-outline';
            else if (route.name === 'Progress') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            else if (route.name === 'ROI') iconName = focused ? 'cash' : 'cash-outline';
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Paths" component={PathsScreen} />
        <Tab.Screen name="Lessons" component={LessonsScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="ROI" component={ROIScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
