import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const DashboardScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning</Text>
        <Text style={styles.title}>MarketPicks.ai</Text>
      </View>

      <View style={styles.portfolioCard}>
        <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
        <Text style={styles.portfolioValue}>$124,532.87</Text>
        <View style={styles.changeRow}>
          <Text style={styles.changePositive}>+$3,241.56 (2.67%)</Text>
          <Text style={styles.timeframe}>Today</Text>
        </View>
      </View>

      <View style={styles.marketStatusCard}>
        <Text style={styles.sectionTitle}>Market Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.marketLabel}>NYSE</Text>
            <Text style={styles.marketOpen}>Open</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.marketLabel}>NASDAQ</Text>
            <Text style={styles.marketOpen}>Open</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.marketLabel}>S&P 500</Text>
            <Text style={styles.marketValue}>5,823.41</Text>
          </View>
        </View>
      </View>

      <View style={styles.holdingsCard}>
        <Text style={styles.sectionTitle}>Top Holdings</Text>
        {[
          { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, price: 178.52, change: 2.34 },
          { symbol: 'MSFT', name: 'Microsoft', shares: 35, price: 378.91, change: 1.87 },
          { symbol: 'GOOGL', name: 'Alphabet', shares: 20, price: 141.80, change: -0.92 },
          { symbol: 'AMZN', name: 'Amazon', shares: 25, price: 178.25, change: 3.21 },
        ].map((stock) => (
          <View key={stock.symbol} style={styles.holdingRow}>
            <View style={styles.holdingInfo}>
              <Text style={styles.holdingSymbol}>{stock.symbol}</Text>
              <Text style={styles.holdingName}>{stock.name}</Text>
            </View>
            <View style={styles.holdingDetails}>
              <Text style={styles.holdingShares}>{stock.shares} shares</Text>
              <Text style={styles.holdingPrice}>${(stock.price * stock.shares).toFixed(2)}</Text>
            </View>
            <Text style={stock.change >= 0 ? styles.changePositive : styles.changeNegative}>
              {stock.change >= 0 ? '+' : ''}{stock.change}%
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20 },
  greeting: { color: '#8B949E', fontSize: 16 },
  title: { color: '#00E676', fontSize: 28, fontWeight: 'bold' },
  portfolioCard: { backgroundColor: '#161B22', margin: 16, padding: 20, borderRadius: 12 },
  portfolioLabel: { color: '#8B949E', fontSize: 14 },
  portfolioValue: { color: '#E6EDF3', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  changePositive: { color: '#00E676', fontSize: 16 },
  changeNegative: { color: '#F85149', fontSize: 16 },
  timeframe: { color: '#8B949E', fontSize: 14 },
  marketStatusCard: { backgroundColor: '#161B22', margin: 16, padding: 20, borderRadius: 12 },
  sectionTitle: { color: '#E6EDF3', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusItem: { alignItems: 'center' },
  marketLabel: { color: '#8B949E', fontSize: 12 },
  marketOpen: { color: '#00E676', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  marketValue: { color: '#E6EDF3', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  holdingsCard: { backgroundColor: '#161B22', margin: 16, padding: 20, borderRadius: 12 },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  holdingInfo: { flex: 1 },
  holdingSymbol: { color: '#E6EDF3', fontSize: 16, fontWeight: 'bold' },
  holdingName: { color: '#8B949E', fontSize: 12 },
  holdingDetails: { alignItems: 'flex-end', flex: 1 },
  holdingShares: { color: '#8B949E', fontSize: 12 },
  holdingPrice: { color: '#E6EDF3', fontSize: 14 },
});

export default DashboardScreen;
