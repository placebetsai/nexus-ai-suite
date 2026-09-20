import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AVAILABLE_LEGS = [
  { id: '1', pick: 'Lakers -4.5', odds: -110, sport: 'NBA' },
  { id: '2', pick: 'Chiefs ML', odds: -145, sport: 'NFL' },
  { id: '3', pick: 'Over 224.5', odds: -105, sport: 'NBA' },
  { id: '4', pick: 'Panthers +1.5', odds: -115, sport: 'NHL' },
  { id: '5', pick: 'Yankees ML', odds: -165, sport: 'MLB' },
  { id: '6', pick: 'Liverpool ML', odds: 140, sport: 'Soccer' },
];

function americanToDecimal(american) {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

export default function ParlayScreen() {
  const [legs, setLegs] = useState([]);
  const [wager, setWager] = useState('10');

  const addLeg = (leg) => {
    if (legs.find((l) => l.id === leg.id)) {
      Alert.alert('Already Added', 'This leg is already in your parlay.');
      return;
    }
    setLegs((prev) => [...prev, leg]);
  };

  const removeLeg = (id) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const totalDecimalOdds = legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
  const totalAmericanOdds = totalDecimalOdds >= 2
    ? Math.round((totalDecimalOdds - 1) * 100)
    : Math.round(-100 / (totalDecimalOdds - 1));
  const potentialPayout = parseFloat(wager || 0) * totalDecimalOdds;
  const profit = potentialPayout - parseFloat(wager || 0);

  const formatAmerican = (val) => {
    if (val > 0) return `+${val}`;
    return `${val}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PARLAY</Text>
        <Ionicons name="calculator-outline" size={24} color="#FFFFFF" />
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {legs.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Legs</Text>
              <Text style={styles.summaryValue}>{legs.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Odds</Text>
              <Text style={[styles.summaryValue, styles.oddsHighlight]}>
                {formatAmerican(totalAmericanOdds)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Wager ($)</Text>
              <TextInput
                style={styles.wagerInput}
                value={wager}
                onChangeText={setWager}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#6B7280"
              />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Potential Payout</Text>
              <Text style={[styles.summaryValue, styles.payoutHighlight]}>
                ${potentialPayout.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={[styles.summaryValue, styles.profitHighlight]}>
                +${profit.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {legs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>YOUR LEGS</Text>
            {legs.map((leg) => (
              <View key={leg.id} style={styles.legCard}>
                <View style={styles.legInfo}>
                  <Text style={styles.legPick}>{leg.pick}</Text>
                  <Text style={styles.legOdds}>{formatAmerican(leg.odds)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeLeg(leg.id)}>
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>ADD LEGS</Text>
        {AVAILABLE_LEGS.filter((l) => !legs.find((lg) => lg.id === l.id)).map((leg) => (
          <TouchableOpacity key={leg.id} style={styles.addLegCard} onPress={() => addLeg(leg)}>
            <View style={styles.addLegInfo}>
              <View style={styles.sportTag}>
                <Text style={styles.sportTagText}>{leg.sport}</Text>
              </View>
              <Text style={styles.addLegPick}>{leg.pick}</Text>
            </View>
            <View style={styles.addLegRight}>
              <Text style={styles.addLegOdds}>{formatAmerican(leg.odds)}</Text>
              <Ionicons name="add-circle" size={26} color="#00E676" />
            </View>
          </TouchableOpacity>
        ))}

        {legs.length >= 2 && (
          <TouchableOpacity
            style={styles.placeBtn}
            onPress={() => Alert.alert('Parlay Created', `${legs.length}-leg parlay at ${formatAmerican(totalAmericanOdds)}`)}
          >
            <Text style={styles.placeBtnText}>Place Parlay</Text>
          </TouchableOpacity>
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
  summaryCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: { color: '#9CA3AF', fontSize: 14 },
  summaryValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  oddsHighlight: { color: '#00E676', fontSize: 20, fontWeight: '900' },
  payoutHighlight: { color: '#FFD700', fontSize: 20, fontWeight: '900' },
  profitHighlight: { color: '#00E676', fontSize: 18, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#2A2A3E', marginVertical: 8 },
  wagerInput: {
    backgroundColor: '#2A2A3E',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    width: 100,
    textAlign: 'right',
  },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12,
  },
  legCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  legInfo: { flex: 1 },
  legPick: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  legOdds: { color: '#FF3B30', fontSize: 14, fontWeight: '700', marginTop: 2 },
  addLegCard: {
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
  addLegInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sportTag: {
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportTagText: { color: '#00E676', fontSize: 10, fontWeight: '800' },
  addLegPick: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  addLegRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addLegOdds: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  placeBtn: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  placeBtnText: { color: '#0D0D0D', fontSize: 16, fontWeight: '900' },
});
