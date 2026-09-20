import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';

export default function SnapScreen() {
  const [captured, setCaptured] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const handleCapture = () => {
    setCaptured(true);
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResults([
        { brand: 'Gucci', item: 'GG Marmont Bag', confidence: '96%', price: '$2,450' },
        { brand: 'Chanel', item: 'Quilted Flap Bag', confidence: '82%', price: '$3,200' },
        { brand: 'Louis Vuitton', item: 'Speedy Bandouliere', confidence: '74%', price: '$1,980' },
      ]);
    }, 2500);
  };

  const handleReset = () => {
    setCaptured(false);
    setAnalyzing(false);
    setResults(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.cameraArea}>
        {!captured ? (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraIcon}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.cameraText}>Tap to snap fashion</Text>
            <Text style={styles.cameraSubtext}>AI will identify brands & items</Text>
          </View>
        ) : (
          <View style={styles.capturedArea}>
            <View style={styles.capturedPlaceholder}>
              <Text style={styles.capturedIcon}>{'\uD83D\uDDBC\uFE0F'}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {!captured ? (
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>{'\u21BB'} Retake</Text>
          </TouchableOpacity>
        )}
      </View>

      {analyzing && (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.analyzingText}>AI Analyzing your snap...</Text>
        </View>
      )}

      {results && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>AI Identification Results</Text>
          {results.map((result, i) => (
            <View key={i} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultBrand}>{result.brand}</Text>
                <Text style={styles.confidenceBadge}>{result.confidence}</Text>
              </View>
              <Text style={styles.resultItem}>{result.item}</Text>
              <View style={styles.resultFooter}>
                <Text style={styles.resultPrice}>{result.price}</Text>
                <TouchableOpacity style={styles.shopBtn}>
                  <Text style={styles.shopBtnText}>Shop Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save to Wardrobe</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Snap Tips</Text>
        <Text style={styles.tipItem}>{'\u2022'} Good lighting improves accuracy by 40%</Text>
        <Text style={styles.tipItem}>{'\u2022'} Capture labels/tags for brand detection</Text>
        <Text style={styles.tipItem}>{'\u2022'} Close-ups work best for pattern matching</Text>
        <Text style={styles.tipItem}>{'\u2022'} Multiple angles = better recommendations</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  cameraArea: {
    margin: 20,
    height: 300,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  cameraIcon: { fontSize: 64, marginBottom: 16 },
  cameraText: { fontSize: 18, color: '#fff', fontWeight: '600' },
  cameraSubtext: { fontSize: 13, color: '#666', marginTop: 8 },
  capturedArea: { flex: 1 },
  capturedPlaceholder: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedIcon: { fontSize: 64 },
  controls: { alignItems: 'center', paddingVertical: 20 },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  resetBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetBtnText: { color: '#E91E63', fontSize: 16, fontWeight: '600' },
  analyzingContainer: { alignItems: 'center', padding: 32 },
  analyzingText: { color: '#E91E63', marginTop: 12, fontSize: 16 },
  resultsSection: { paddingHorizontal: 20, marginTop: 8 },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  resultCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultBrand: { fontSize: 18, fontWeight: 'bold', color: '#E91E63' },
  confidenceBadge: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultItem: { fontSize: 14, color: '#ccc', marginTop: 4 },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  resultPrice: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  shopBtn: { backgroundColor: '#E91E63', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  shopBtnText: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2a2a3e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveBtnText: { color: '#E91E63', fontSize: 16, fontWeight: '600' },
  tipsSection: { paddingHorizontal: 20, marginTop: 8, paddingBottom: 40 },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  tipItem: { fontSize: 13, color: '#999', marginBottom: 8, lineHeight: 20 },
});
