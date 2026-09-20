import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BET_HISTORY = [
  { id: '1', pick: 'Lakers -4.5', result: 'W', payout: 90.91, odds: -110, wager: 100, date: 'Sep 19' },
  { id: '2', pick: 'Chiefs ML', result: 'W', payout: 68.97, odds: -145, wager: 100, date: 'Sep 18' },
  { id: '3', pick: 'Over 224.5', result: 'L', payout: 0, odds: -105, wager: 100, date: 'Sep 17' },
  { id: '4', pick: 'Panthers +1.5', result: 'W', payout: 86.96, odds: -115, wager: 100, date: 'Sep 16' },
  { id: '5', pick: 'Yankees ML', result: 'L', payout: 0, odds: -165, wager: 100, date: 'Sep 15' },
  { id: '6', pick: 'Warriors -3', result: 'W', payout: 90.91, odds: -110, wager: 100, date: 'Sep 14' },
  { id: '7', pick: 'Ravens ML', result: 'W', payout: 120.00, odds: 120, wager: 100, date: 'Sep 13' },
];

const STATS = {
  totalBets: 47,
  wins: 29,
  losses: 18,
  winRate: 61.7,
  totalPnL: 523.40,
  roi: 11.1,
};

const chartData = [120, -45, 200, 80, -30, 350, 180, -90, 260, 150, -60, 523];

function PnLChart() {
  const maxVal = Math.max(...chartData.map(Math.abs));
  const barWidth = (width - 80) / chartData.length;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>P/L History</Text>
      <View style={styles.chart}>
        {chartData.map((val, i) => {
          const height = Math.abs(val) / maxVal * 80;
          const isPositive = val >= 0;
          return (
            <View key={i} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: isPositive ? '#00E676' : '#FF3B30',
                    marginBottom: isPositive ? 0 : 'auto',
                    marginTop: isPositive ? 'auto' : 0,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>Sep 10</Text>
        <Text style={styles.chartLabel}>Sep 20</Text>
      </View>
    </View>
  );
}

export default function TrackerScreen() {
  const [tab, setTab] = useState('history');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TRACKER</Text>
        <Ionicons name="stats-chart" size={22} color="#FFFFFF" />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statGreen]}>
            <Text style={styles.statValue}>${STATS.totalPnL.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total P/L</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.totalBets}</Text>
            <Text style={styles.statLabel}>Total Bets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{STATS.wins}W / {STATS.losses}L</Text>
            <Text style={styles.statLabel}>Record</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>+{STATS.roi}%</Text>
            <Text style={styles.statLabel}>ROI</Text>
          </View>
        </View>

        <PnLChart />

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active</Text>
          </TouchableOpacity>
        </View>

        {tab === 'history' ? (
          BET_HISTORY.map((b) => (
            <View key={b.id} style={styles.betCard}>
              <View style={styles.betLeft}>
                <View style={[styles.resultDot, b.result === 'W' ? styles.winDot : styles.lossDot]}>
                  <Text style={styles.resultText}>{b.result}</Text>
                </View>
                <View>
                  <Text style={styles.betPick}>{b.pick}</Text>
                  <Text style={styles.betDate}>{b.date} | {b.odds > 0 ? '+' : ''}{b.odds}</Text>
                </View>
              </View>
              <View style={styles.betRight}>
                <Text style={[styles.betPayout, b.result === 'W' ? styles.winColor : styles.lossColor]}>
                  {b.result === 'W' ? `+$${b.payout.toFixed(2)}` : `-$${b.wager.toFixed(2)}`}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No active bets</Text>
            <Text style={styles.emptySubtext}>Track picks to see them here</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  body: { flex: 1, paddingHorizontal: 20 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  statGreen: { borderColor: '#00E676' },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statLabel: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  chartContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  chartTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
  },
  barWrap: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 16, borderRadius: 4 },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  chartLabel: { color: '#6B7280', fontSize: 11 },
  tabRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 14,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  tabBtnActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  tabText: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#0D0D0D' },
  betCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  betLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  resultDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winDot: { backgroundColor: '#00E676' },
  lossDot: { backgroundColor: '#FF3B30' },
  resultText: { color: '#0D0D0D', fontSize: 14, fontWeight: '900' },
  betPick: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  betDate: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  betRight: { marginLeft: 12 },
  betPayout: { fontSize: 16, fontWeight: '800' },
  winColor: { color: '#00E676' },
  lossColor: { color: '#FF3B30' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySubtext: { color: '#6B7280', fontSize: 13, marginTop: 4 },
});
