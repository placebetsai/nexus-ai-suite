import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';

const wardrobeItems = [
  { id: '1', name: 'Designer Bag Collection', count: 12, icon: '\uD83D\uDC5C' },
  { id: '2', name: 'Vintage Pieces', count: 8, icon: '\u23F0' },
  { id: '3', name: 'Streetwear', count: 15, icon: '\uD83C\uDFC3' },
  { id: '4', name: 'Formal Wear', count: 6, icon: '\uD83D\uDC57' },
];

const myListings = [
  { id: '1', name: 'Vintage Gucci Belt', price: '$280', status: 'Active', views: 142 },
  { id: '2', name: 'Nike Air Jordan 1', price: '$350', status: 'Sold', views: 89 },
];

export default function ProfileScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>{'\uD83D\uDC64'}</Text>
        </View>
        <Text style={styles.userName}>Fashionista Vogue</Text>
        <Text style={styles.userHandle}>@vogue_styles</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>247</Text>
            <Text style={styles.statLabel}>Wardrobe</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1.2k</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>89</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Wardrobe</Text>
        {wardrobeItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.wardrobeCard}>
            <Text style={styles.wardrobeIcon}>{item.icon}</Text>
            <View style={styles.wardrobeInfo}>
              <Text style={styles.wardrobeName}>{item.name}</Text>
              <Text style={styles.wardrobeCount}>{item.count} items</Text>
            </View>
            <Text style={styles.arrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Listings</Text>
        {myListings.map((item) => (
          <View key={item.id} style={styles.listingCard}>
            <View style={styles.listingInfo}>
              <Text style={styles.listingName}>{item.name}</Text>
              <Text style={styles.listingViews}>{item.views} views</Text>
            </View>
            <View style={styles.listingRight}>
              <Text style={styles.listingPrice}>{item.price}</Text>
              <Text style={[styles.listingStatus, item.status === 'Sold' && styles.soldStatus]}>
                {item.status}
              </Text>
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addListingBtn}>
          <Text style={styles.addListingText}>+ Add New Listing</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#333', true: '#E91E63' }}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#333', true: '#E91E63' }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Fashionistas.ai v1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  profileHeader: { alignItems: 'center', paddingVertical: 30 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 48 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  userHandle: { fontSize: 14, color: '#E91E63', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 40,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  wardrobeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  wardrobeIcon: { fontSize: 24, marginRight: 14 },
  wardrobeInfo: { flex: 1 },
  wardrobeName: { fontSize: 15, color: '#fff', fontWeight: '500' },
  wardrobeCount: { fontSize: 12, color: '#666', marginTop: 2 },
  arrow: { fontSize: 24, color: '#666' },
  listingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  listingInfo: { flex: 1 },
  listingName: { fontSize: 15, color: '#fff', fontWeight: '500' },
  listingViews: { fontSize: 12, color: '#666', marginTop: 4 },
  listingRight: { alignItems: 'flex-end' },
  listingPrice: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  listingStatus: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    backgroundColor: '#4CAF5022',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  soldStatus: { color: '#666', backgroundColor: '#66666622' },
  addListingBtn: {
    borderWidth: 1,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addListingText: { color: '#E91E63', fontSize: 14, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingLabel: { fontSize: 15, color: '#fff' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: '#f44336', fontSize: 16, fontWeight: '600' },
  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { color: '#333', fontSize: 12 },
});
