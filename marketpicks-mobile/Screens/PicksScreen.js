import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

const PicksScreen = () => {
  const [filter, setFilter] = useState('ALL');

  const picks = [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', action: 'BUY', confidence: 94, target: 520, current: 485.21, reason: 'AI chip demand surge, strong earnings growth' },
    { symbol: 'AAPL', name: 'Apple Inc.', action: 'HOLD', confidence: 78, target: 185, current: 178.52, reason: 'Stable performance, awaiting new product cycle' },
    { symbol: 'TSLA', name: 'Tesla Inc.', action: 'SELL', confidence: 71, target: 180, current: 248.42, reason: 'Overvalued, margin pressure, competition increasing' },
    { symbol: 'META', name: 'Meta Platforms', action: 'BUY', confidence: 87, target: 420, current: 389.12, reason: 'Ad revenue recovery, AI integration, cost cuts' },
    { symbol: 'JPM', name: 'JPMorgan Chase', action: 'BUY', confidence: 82, target: 205, current: 189.34, reason: 'Interest rate environment benefits, strong balance sheet' },
    { symbol: 'DIS', name: 'Walt Disney', action: 'SELL', confidence: 65, target: 78, current: 95.21, reason: 'Streaming losses, theme park slowdown, debt concerns' },
  ];

  const filtered = filter === 'ALL' ? picks : picks.filter(p => p.action === filter);

  const getActionColor = (action) => {
    if (action === 'BUY') return '#00E676';
    if (action === 'SELL') return '#F85149';
    return '#D29922';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Picks</Text>
        <Text style={styles.subtitle}>Powered by MarketPicks.ai</Text>
      </View>

      <View style={styles.filterRow}>
        {['ALL', 'BUY', 'SELL', 'HOLD'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((pick) => (
        <View key={pick.symbol} style={styles.pickCard}>
          <View style={styles.pickHeader}>
            <View>
              <Text style={styles.pickSymbol}>{pick.symbol}</Text>
              <Text style={styles.pickName}>{pick.name}</Text>
            </View>
            <View style={[styles.actionBadge, { backgroundColor: getActionColor(pick.action) + '20' }]}>
              <Text style={[styles.actionText, { color: getActionColor(pick.action) }]}>{pick.action}</Text>
            </View>
          </View>

          <View style={styles.confidenceRow}>
            <Text style={styles.confLabel}>Confidence</Text>
            <View style={styles.confBar}>
              <View style={[styles.confFill, { width: `${pick.confidence}%`, backgroundColor: getActionColor(pick.action) }]} />
            </View>
            <Text style={styles.confValue}>{pick.confidence}%</Text>
          </View>

          <View style={styles.targetRow}>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Current</Text>
              <Text style={styles.targetValue}>${pick.current}</Text>
            </View>
            <Text style={styles.targetArrow}>→</Text>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Target</Text>
              <Text style={[styles.targetValue, { color: getActionColor(pick.action) }]}>${pick.target}</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={styles.targetLabel}>Upside</Text>
              <Text style={[styles.targetValue, { color: pick.target > pick.current ? '#00E676' : '#F85149' }]}>
                {((pick.target - pick.current) / pick.current * 100).toFixed(1)}%
              </Text>
            </View>
          </View>

          <Text style={styles.reason}>{pick.reason}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20 },
  title: { color: '#E6EDF3', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#8B949E', fontSize: 14, marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#161B22', marginRight: 10, borderWidth: 1, borderColor: '#30363D' },
  filterBtnActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  filterText: { color: '#8B949E', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#0D1117' },
  pickCard: { backgroundColor: '#161B22', margin: 16, marginBottom: 8, padding: 18, borderRadius: 12 },
  pickHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickSymbol: { color: '#E6EDF3', fontSize: 20, fontWeight: 'bold' },
  pickName: { color: '#8B949E', fontSize: 13, marginTop: 2 },
  actionBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  actionText: { fontSize: 14, fontWeight: 'bold' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  confLabel: { color: '#8B949E', fontSize: 13, width: 80 },
  confBar: { flex: 1, height: 8, backgroundColor: '#30363D', borderRadius: 4, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 4 },
  confValue: { color: '#E6EDF3', fontSize: 13, marginLeft: 10, width: 40, textAlign: 'right' },
  targetRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 16, backgroundColor: '#0D1117', padding: 14, borderRadius: 10 },
  targetItem: { alignItems: 'center' },
  targetLabel: { color: '#8B949E', fontSize: 11 },
  targetValue: { color: '#E6EDF3', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  targetArrow: { color: '#8B949E', fontSize: 18 },
  reason: { color: '#8B949E', fontSize: 13, marginTop: 14, lineHeight: 18 },
});

export default PicksScreen;
