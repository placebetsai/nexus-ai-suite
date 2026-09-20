import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'Soccer'];

const ODDS_DATA = {
  NFL: [
    { id: '1', away: 'Chiefs', home: 'Bills', spread: '-3.5', total: '48.5', ml1: '-170', ml2: '+145' },
    { id: '2', away: 'Cowboys', home: 'Eagles', spread: '+2.5', total: '51.5', ml1: '+120', ml2: '-140' },
    { id: '3', away: '49ers', home: 'Seahawks', spread: '-6.0', total: '44.0', ml1: '-250', ml2: '+200' },
    { id: '4', away: 'Ravens', home: 'Bengals', spread: '-1.5', total: '46.5', ml1: '-125', ml2: '+105' },
  ],
  NBA: [
    { id: '1', away: 'Lakers', home: 'Celtics', spread: '-4.5', total: '224.5', ml1: '-190', ml2: '+160' },
    { id: '2', away: 'Warriors', home: 'Nuggets', spread: '+3.0', total: '218.0', ml1: '+135', ml2: '-155' },
    { id: '3', away: 'Bucks', home: 'Heat', spread: '-2.0', total: '212.5', ml1: '-130', ml2: '+110' },
    { id: '4', away: 'Suns', home: 'Mavericks', spread: '+1.5', total: '220.0', ml1: '+105', ml2: '-125' },
  ],
  MLB: [
    { id: '1', away: 'Yankees', home: 'Red Sox', spread: '-1.5', total: '8.5', ml1: '-165', ml2: '+140' },
    { id: '2', away: 'Dodgers', home: 'Giants', spread: '-1.5', total: '7.5', ml1: '-180', ml2: '+150' },
    { id: '3', away: 'Astros', home: 'Rangers', spread: '+1.5', total: '9.0', ml1: '+115', ml2: '-135' },
  ],
  NHL: [
    { id: '1', away: 'Oilers', home: 'Panthers', spread: '+1.5', total: '5.5', ml1: '-110', ml2: '-110' },
    { id: '2', away: 'Rangers', home: 'Hurricanes', spread: '-1.5', total: '6.0', ml1: '+130', ml2: '-150' },
    { id: '3', away: 'Stars', home: 'Avalanche', spread: '+1.5', total: '6.5', ml1: '-120', ml2: '+100' },
  ],
  Soccer: [
    { id: '1', away: 'Man City', home: 'Liverpool', spread: '+0.5', total: '2.5', ml1: '+180', ml2: '+140' },
    { id: '2', away: 'Barcelona', home: 'Real Madrid', spread: '-0.5', total: '3.0', ml1: '+110', ml2: '+220' },
    { id: '3', away: 'PSG', home: 'Bayern', spread: '0.0', total: '2.5', ml1: '+150', ml2: '+160' },
  ],
};

export default function OddsScreen() {
  const [selectedSport, setSelectedSport] = useState('NFL');

  const renderOddsRow = ({ item }) => (
    <View style={styles.oddsRow}>
      <View style={styles.teamCol}>
        <Text style={styles.teamName}>{item.away}</Text>
        <Text style={styles.teamName}>{item.home}</Text>
      </View>
      <View style={styles.oddsCol}>
        <Text style={styles.oddsHeader}>Spread</Text>
        <Text style={styles.oddsValue}>{item.spread}</Text>
      </View>
      <View style={styles.oddsCol}>
        <Text style={styles.oddsHeader}>Total</Text>
        <Text style={styles.oddsValue}>{item.total}</Text>
      </View>
      <View style={styles.oddsCol}>
        <Text style={styles.oddsHeader}>ML</Text>
        <TouchableOpacity style={styles.oddsBtn}>
          <Text style={styles.oddsBtnText}>{item.ml1}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.oddsCol}>
        <Text style={styles.oddsHeader}>ML</Text>
        <TouchableOpacity style={styles.oddsBtn}>
          <Text style={styles.oddsBtnText}>{item.ml2}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ODDS</Text>
        <Ionicons name="search-outline" size={22} color="#FFFFFF" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportTabs}>
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sportTab, selectedSport === s && styles.sportTabActive]}
            onPress={() => setSelectedSport(s)}
          >
            <Text style={[styles.sportTabText, selectedSport === s && styles.sportTabTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.tableHeader}>
        <Text style={[styles.thText, { flex: 1.2 }]}>TEAMS</Text>
        <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>SPREAD</Text>
        <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>TOTAL</Text>
        <Text style={[styles.thText, { flex: 1, textAlign: 'center' }]}>MONEYLINE</Text>
      </View>

      <FlatList
        data={ODDS_DATA[selectedSport]}
        keyExtractor={(item) => item.id}
        renderItem={renderOddsRow}
        contentContainerStyle={styles.oddsList}
        showsVerticalScrollIndicator={false}
      />
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
  sportTabs: { paddingHorizontal: 20, marginBottom: 16 },
  sportTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  sportTabActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  sportTabText: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
  sportTabTextActive: { color: '#0D0D0D' },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  thText: { color: '#6B7280', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  oddsList: { paddingHorizontal: 20 },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F33',
  },
  teamCol: { flex: 1.2 },
  teamName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  oddsCol: { flex: 0.8, alignItems: 'center' },
  oddsHeader: { color: '#6B7280', fontSize: 10, marginBottom: 4 },
  oddsValue: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  oddsBtn: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  oddsBtnText: { color: '#00E676', fontSize: 13, fontWeight: '800' },
});
