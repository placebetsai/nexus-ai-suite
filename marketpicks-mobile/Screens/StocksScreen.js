import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

const StocksScreen = () => {
  const [search, setSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);

  const stocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.52, change: 2.34, volume: '52.3M', marketCap: '2.8T', pe: 28.5, high52: 198.23, low52: 124.17 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: 1.87, volume: '21.8M', marketCap: '2.8T', pe: 35.2, high52: 384.30, low52: 245.61 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: -0.92, volume: '18.2M', marketCap: '1.8T', pe: 24.1, high52: 153.78, low52: 83.45 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: 3.21, volume: '42.1M', marketCap: '1.9T', pe: 62.3, high52: 189.77, low52: 81.43 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.42, change: -2.15, volume: '88.7M', marketCap: '789B', pe: 72.4, high52: 299.29, low52: 101.81 },
  ];

  if (selectedStock) {
    return (
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => setSelectedStock(null)} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.detailHeader}>
          <Text style={styles.detailSymbol}>{selectedStock.symbol}</Text>
          <Text style={styles.detailName}>{selectedStock.name}</Text>
          <Text style={styles.detailPrice}>${selectedStock.price}</Text>
          <Text style={selectedStock.change >= 0 ? styles.changePositive : styles.changeNegative}>
            {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change}%
          </Text>
        </View>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>Price Chart</Text>
          <View style={styles.chartArea}>
            <View style={[styles.chartBar, { height: 60, backgroundColor: '#00E676' }]} />
            <View style={[styles.chartBar, { height: 80, backgroundColor: '#00E676' }]} />
            <View style={[styles.chartBar, { height: 45, backgroundColor: '#F85149' }]} />
            <View style={[styles.chartBar, { height: 90, backgroundColor: '#00E676' }]} />
            <View style={[styles.chartBar, { height: 70, backgroundColor: '#00E676' }]} />
            <View style={[styles.chartBar, { height: 55, backgroundColor: '#F85149' }]} />
            <View style={[styles.chartBar, { height: 85, backgroundColor: '#00E676' }]} />
          </View>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statRow}><Text style={styles.statLabel}>Volume</Text><Text style={styles.statValue}>{selectedStock.volume}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>Market Cap</Text><Text style={styles.statValue}>{selectedStock.marketCap}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>P/E Ratio</Text><Text style={styles.statValue}>{selectedStock.pe}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>52W High</Text><Text style={styles.statValue}>${selectedStock.high52}</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>52W Low</Text><Text style={styles.statValue}>${selectedStock.low52}</Text></View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stocks</Text>
        <TextInput style={styles.searchBar} placeholder="Search stocks..." placeholderTextColor="#8B949E" value={search} onChangeText={setSearch} />
      </View>
      {stocks.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase())).map((stock) => (
        <TouchableOpacity key={stock.symbol} style={styles.stockCard} onPress={() => setSelectedStock(stock)}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockSymbol}>{stock.symbol}</Text>
            <Text style={styles.stockName}>{stock.name}</Text>
          </View>
          <View style={styles.stockPrice}>
            <Text style={styles.price}>${stock.price}</Text>
            <Text style={stock.change >= 0 ? styles.changePositive : styles.changeNegative}>
              {stock.change >= 0 ? '+' : ''}{stock.change}%
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: { padding: 20 },
  title: { color: '#E6EDF3', fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  searchBar: { backgroundColor: '#161B22', color: '#E6EDF3', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#30363D', fontSize: 16 },
  stockCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B22', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 10 },
  stockInfo: { flex: 1 },
  stockSymbol: { color: '#E6EDF3', fontSize: 18, fontWeight: 'bold' },
  stockName: { color: '#8B949E', fontSize: 13, marginTop: 2 },
  stockPrice: { alignItems: 'flex-end' },
  price: { color: '#E6EDF3', fontSize: 16 },
  changePositive: { color: '#00E676', fontSize: 14, marginTop: 4 },
  changeNegative: { color: '#F85149', fontSize: 14, marginTop: 4 },
  backButton: { padding: 20 },
  backText: { color: '#00E676', fontSize: 16 },
  detailHeader: { padding: 20, alignItems: 'center' },
  detailSymbol: { color: '#E6EDF3', fontSize: 32, fontWeight: 'bold' },
  detailName: { color: '#8B949E', fontSize: 16, marginTop: 4 },
  detailPrice: { color: '#E6EDF3', fontSize: 36, fontWeight: 'bold', marginTop: 12 },
  chartPlaceholder: { margin: 16, backgroundColor: '#161B22', borderRadius: 12, padding: 20 },
  chartText: { color: '#8B949E', fontSize: 14, marginBottom: 16 },
  chartArea: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100 },
  chartBar: { width: 40, borderRadius: 4 },
  statsCard: { margin: 16, backgroundColor: '#161B22', borderRadius: 12, padding: 20 },
  sectionTitle: { color: '#E6EDF3', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  statLabel: { color: '#8B949E', fontSize: 14 },
  statValue: { color: '#E6EDF3', fontSize: 14 },
});

export default StocksScreen;
