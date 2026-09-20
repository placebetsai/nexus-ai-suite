import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';

const templates = [
  { id: '1', name: 'Portfolio', description: 'Personal portfolio with projects showcase', color: '#00d4ff', icon: '💼' },
  { id: '2', name: 'Landing Page', description: 'Modern landing page with hero section', color: '#00ff88', icon: '🚀' },
  { id: '3', name: 'E-Commerce', description: 'Product listing and cart UI', color: '#ff6b6b', icon: '🛒' },
  { id: '4', name: 'Blog', description: 'Blog layout with article cards', color: '#ffd93d', icon: '📝' },
  { id: '5', name: 'Dashboard', description: 'Admin dashboard with charts', color: '#c084fc', icon: '📊' },
  { id: '6', name: 'Mobile App', description: 'React Native app template', color: '#fb923c', icon: '📱' },
];

export default function TemplateScreen() {
  const renderTemplate = ({ item }) => (
    <TouchableOpacity style={[styles.card, { borderLeftColor: item.color }]}>
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Text style={styles.cardName}>{item.name}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
      <TouchableOpacity style={[styles.useButton, { backgroundColor: item.color }]}>
        <Text style={styles.useButtonText}>Use Template</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.title}>Templates</Text>
        <Text style={styles.subtitle}>Start with a pre-built template</Text>
      </View>
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  grid: {
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    borderLeftWidth: 4,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  useButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  useButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
