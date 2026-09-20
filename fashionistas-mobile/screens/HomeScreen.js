import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';

const stats = [
  { id: '1', label: 'Wardrobe Items', value: '247', icon: '\uD83D\uDC57' },
  { id: '2', label: 'Snaps Today', value: '12', icon: '\uD83D\uDCF7' },
  { id: '3', label: 'AI Matches', value: '38', icon: '\u2728' },
  { id: '4', label: 'Sold Items', value: '15', icon: '\uD83D\uDCB0' },
];

const recentItems = [
  { id: '1', name: 'Vintage Levi\'s Jacket', price: '$89', image: 'https://picsum.photos/100' },
  { id: '2', name: 'Designer Handbag', price: '$245', image: 'https://picsum.photos/100' },
  { id: '3', name: 'Silk Scarf', price: '$34', image: 'https://picsum.photos/100' },
  { id: '4', name: 'Platform Boots', price: '$128', image: 'https://picsum.photos/100' },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, Vogue!</Text>
        <Text style={styles.subtitle}>Your fashion command center</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Snaps</Text>
        <FlatList
          horizontal
          data={recentItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recentCard}>
              <View style={styles.recentImagePlaceholder}>
                <Text style={styles.placeholderText}>{'\uD83D\uDDBC\uFE0F'}</Text>
              </View>
              <Text style={styles.recentName}>{item.name}</Text>
              <Text style={styles.recentPrice}>{item.price}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.actionLabel}>New Snap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>{'\uD83D\uDD0D'}</Text>
            <Text style={styles.actionLabel}>AI Identify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>{'\uD83D\uDD76\uFE0F'}</Text>
            <Text style={styles.actionLabel}>AR Try-On</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>{'\uD83D\uDED2'}</Text>
            <Text style={styles.actionLabel}>Sell Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending This Week</Text>
        <View style={styles.trendingList}>
          {['Y2K Revival', 'Cottagecore', 'Dark Academia', 'Streetwear Luxe'].map((trend, i) => (
            <View key={i} style={styles.trendingItem}>
              <Text style={styles.trendingRank}>#{i + 1}</Text>
              <Text style={styles.trendingName}>{trend}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 10 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#E91E63' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  recentCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  recentImagePlaceholder: {
    width: 140,
    height: 120,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 40 },
  recentName: { fontSize: 12, color: '#fff', padding: 8, paddingBottom: 2 },
  recentPrice: { fontSize: 14, fontWeight: 'bold', color: '#E91E63', paddingHorizontal: 8, paddingBottom: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: {
    width: '22%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionLabel: { fontSize: 10, color: '#ccc', textAlign: 'center' },
  trendingList: { gap: 8 },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  trendingRank: { fontSize: 16, fontWeight: 'bold', color: '#E91E63', marginRight: 12 },
  trendingName: { fontSize: 14, color: '#fff' },
});
