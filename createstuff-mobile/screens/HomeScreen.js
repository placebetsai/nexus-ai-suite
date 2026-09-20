import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';

const projects = [
  { id: '1', name: 'Portfolio Website', language: 'HTML/CSS', date: '2026-09-18', size: '12KB' },
  { id: '2', name: 'Weather App', language: 'JavaScript', date: '2026-09-17', size: '8KB' },
  { id: '3', name: 'Todo List', language: 'React', date: '2026-09-16', size: '5KB' },
  { id: '4', name: 'Calculator', language: 'HTML/CSS/JS', date: '2026-09-15', size: '3KB' },
  { id: '5', name: 'Landing Page', language: 'HTML/CSS', date: '2026-09-14', size: '15KB' },
];

export default function HomeScreen() {
  const renderProject = ({ item }) => (
    <TouchableOpacity style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectLanguage}>{item.language}</Text>
      </View>
      <View style={styles.projectFooter}>
        <Text style={styles.projectDate}>{item.date}</Text>
        <Text style={styles.projectSize}>{item.size}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.title}>CreateStuff.ai</Text>
        <Text style={styles.subtitle}>Your Projects</Text>
      </View>
      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+ New Project</Text>
      </TouchableOpacity>
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
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00d4ff',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  projectLanguage: {
    fontSize: 12,
    color: '#00d4ff',
    backgroundColor: '#00d4ff20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  projectDate: {
    fontSize: 12,
    color: '#666',
  },
  projectSize: {
    fontSize: 12,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#00d4ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
