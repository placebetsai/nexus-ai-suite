import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';

const garments = [
  { id: '1', name: 'Summer Dress', color: '#E91E63' },
  { id: '2', name: 'Leather Jacket', color: '#9C27B0' },
  { id: '3', name: 'Silk Blouse', color: '#2196F3' },
  { id: '4', name: 'Wide Leg Pants', color: '#4CAF50' },
  { id: '5', name: 'Cashmere Sweater', color: '#FF9800' },
];

export default function ARScreen() {
  const [selectedGarment, setSelectedGarment] = useState(null);
  const [arActive, setArActive] = useState(false);

  const toggleAR = () => {
    setArActive(!arActive);
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraFeed}>
        {arActive ? (
          <View style={styles.arActiveContainer}>
            <View style={styles.arPlaceholder}>
              <Text style={styles.arIcon}>{'\uD83D\uDD76\uFE0F'}</Text>
              <Text style={styles.arText}>AR Camera Feed Active</Text>
              {selectedGarment && (
                <View style={[styles.garmentOverlay, { borderColor: selectedGarment.color }]}>
                  <Text style={styles.overlayText}>{selectedGarment.name}</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.arInactiveContainer}>
            <Text style={styles.arIconLarge}>{'\uD83D\uDD76\uFE0F'}</Text>
            <Text style={styles.inactiveText}>AR Try-On</Text>
            <Text style={styles.inactiveSubtext}>Select a garment and tap Start</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.startBtn, arActive && styles.stopBtn]}
          onPress={toggleAR}
        >
          <Text style={styles.startBtnText}>
            {arActive ? '\u23F9 Stop AR' : '\u25B6 Start AR'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.garmentSection}>
        <Text style={styles.sectionTitle}>Select Garment</Text>
        <FlatList
          data={garments}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.garmentCard,
                selectedGarment?.id === item.id && styles.garmentCardSelected,
                { borderColor: item.color },
              ]}
              onPress={() => setSelectedGarment(item)}
            >
              <View style={[styles.garmentPreview, { backgroundColor: item.color + '33' }]}>
                <Text style={styles.garmentEmoji}>{'\uD83D\uDC55'}</Text>
              </View>
              <Text style={styles.garmentName}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>AR Features</Text>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>{'\u2713'}</Text>
          <Text style={styles.featureText}>Real-time fit visualization</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>{'\u2713'}</Text>
          <Text style={styles.featureText}>Color matching engine</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>{'\u2713'}</Text>
          <Text style={styles.featureText}>Body measurement sync</Text>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureIcon}>{'\u2713'}</Text>
          <Text style={styles.featureText}>Share your look</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  cameraFeed: {
    flex: 1,
    margin: 20,
    marginBottom: 0,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  arActiveContainer: { flex: 1 },
  arPlaceholder: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arIcon: { fontSize: 48, marginBottom: 8 },
  arText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  garmentOverlay: {
    marginTop: 20,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    width: 200,
    alignItems: 'center',
  },
  overlayText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  arInactiveContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  arIconLarge: { fontSize: 64, marginBottom: 12 },
  inactiveText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  inactiveSubtext: { fontSize: 13, color: '#666', marginTop: 4 },
  controls: { paddingVertical: 16, alignItems: 'center' },
  startBtn: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 25,
  },
  stopBtn: { backgroundColor: '#f44336' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  garmentSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  garmentCard: {
    width: 100,
    marginRight: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  garmentCardSelected: { backgroundColor: '#2a2a3e' },
  garmentPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  garmentEmoji: { fontSize: 28 },
  garmentName: { fontSize: 11, color: '#ccc', textAlign: 'center' },
  infoPanel: { paddingHorizontal: 20, paddingBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureIcon: { color: '#4CAF50', marginRight: 10, fontSize: 14 },
  featureText: { color: '#999', fontSize: 13 },
});
