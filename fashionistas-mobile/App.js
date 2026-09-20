import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from './screens/HomeScreen';
import SnapScreen from './screens/SnapScreen';
import ARScreen from './screens/ARScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import ProfileScreen from './screens/ProfileScreen';
import CheckoutScreen from './screens/CheckoutScreen';

const Tab = createBottomTabNavigator();

const tabConfig = {
  Home: { emoji: '\uD83C\uDFE0', label: 'Home' },
  Snap: { emoji: '\uD83D\uDCF7', label: 'Snap' },
  'AR Try-On': { emoji: '\uD83D\uDD76\uFE0F', label: 'AR Try-On' },
  Marketplace: { emoji: '\uD83D\uDED2', label: 'Marketplace' },
  Profile: { emoji: '\uD83D\uDC64', label: 'Profile' },
};

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>
              {tabConfig[route.name]?.emoji}
            </Text>
          ),
          tabBarActiveTintColor: '#E91E63',
          tabBarInactiveTintColor: '#999',
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Snap" component={SnapScreen} />
        <Tab.Screen name="AR Try-On" component={ARScreen} />
        <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
