import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import DashboardScreen from './Screens/DashboardScreen';
import StocksScreen from './Screens/StocksScreen';
import PicksScreen from './Screens/PicksScreen';
import WatchlistScreen from './Screens/WatchlistScreen';
import PortfolioScreen from './Screens/PortfolioScreen';

const Tab = createBottomTabNavigator();

const theme = {
  dark: true,
  colors: {
    primary: '#00E676',
    background: '#0D1117',
    card: '#161B22',
    text: '#E6EDF3',
    border: '#30363D',
    notification: '#00E676',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#161B22',
            borderTopColor: '#30363D',
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
          tabBarActiveTintColor: '#00E676',
          tabBarInactiveTintColor: '#8B949E',
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Stocks" component={StocksScreen} />
        <Tab.Screen name="Picks" component={PicksScreen} />
        <Tab.Screen name="Watchlist" component={WatchlistScreen} />
        <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
