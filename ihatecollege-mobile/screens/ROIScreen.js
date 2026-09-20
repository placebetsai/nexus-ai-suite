import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#0a0a0f',
  card: '#12121a',
  neonPink: '#ff2d7b',
  neonCyan: '#00f0ff',
  neonGreen: '#39ff14',
  neonPurple: '#bf00ff',
  neonYellow: '#ffe600',
  text: '#e0e0e0',
  textDim: '#6b6b8d',
};

const COMPARISONS = [
  {
    method: '4-Year College',
    cost: '$120,000',
    time: '4 years',
    debt: '$40,000 avg',
    salary: '$55,000 starting',
    icon: 'school',
    color: COLORS.neonPink,
    verdict: 'DEAD END',
  },
  {
    method: 'Bootcamp',
    cost: '$15,000',
    time: '3-6 months',
    debt: '$0-$10,000',
    salary: '$70,000 starting',
    icon: 'rocket',
    color: COLORS.neonYellow,
    verdict: 'DECENT',
  },
  {
    method: 'Self-Taught (IHC)',
    cost: '$49/mo',
    time: 'Your pace',
    debt: '$0',
    salary: '$75,000+ starting',
    icon: 'flame',
    color: COLORS.neonGreen,
    verdict: 'WINNER',
  },
];

export default function ROIScreen() {
  const [salary, setSalary] = useState('75000');
  const [collegeCost, setCollegeCost] = useState('120000');

  const salaryNum = parseInt(salary) || 75000;
  const collegeCostNum = parseInt(collegeCost) || 120000;
  const ihcCost = 49 * 12 * 4; // 4 years of monthly sub
  const savings = collegeCostNum - ihcCost;
  const yearsToRecoup = (savings / (salaryNum * 0.08)).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ROI CALCULATOR</Text>
        <Text style={styles.headerSubtitle}>The math doesn't lie. College is overpriced.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {COMPARISONS.map((item, i) => (
          <View
            key={i}
            style={[styles.compareCard, { borderLeftColor: item.color }]}
          >
            <View style={styles.compareTop}>
              <Ionicons name={item.icon} size={28} color={item.color} />
              <Text style={[styles.compareMethod, { color: item.color }]}>
                {item.method}
              </Text>
              <View
                style={[
                  styles.verdictBadge,
                  { backgroundColor: item.color + '20' },
                ]}
              >
                <Text style={[styles.verdictText, { color: item.color }]}>
                  {item.verdict}
                </Text>
              </View>
            </View>
            <View style={styles.compareGrid}>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>Cost</Text>
                <Text style={styles.compareValue}>{item.cost}</Text>
              </View>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>Time</Text>
                <Text style={styles.compareValue}>{item.time}</Text>
              </View>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>Debt</Text>
                <Text style={styles.compareValue}>{item.debt}</Text>
              </View>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>Salary</Text>
                <Text style={styles.compareValue}>{item.salary}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>CUSTOM CALCULATION</Text>
        <View style={styles.calcCard}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Target Salary ($)</Text>
            <TextInput
              style={styles.input}
              value={salary}
              onChangeText={setSalary}
              keyboardType="numeric"
              placeholder="75000"
              placeholderTextColor={COLORS.textDim}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>College Cost ($)</Text>
            <TextInput
              style={styles.input}
              value={collegeCost}
              onChangeText={setCollegeCost}
              keyboardType="numeric"
              placeholder="120000"
              placeholderTextColor={COLORS.textDim}
            />
          </View>

          <View style={styles.resultBox}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>You save with IHC</Text>
              <Text style={[styles.resultValue, { color: COLORS.neonGreen }]}>
                ${savings.toLocaleString()}
              </Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Years to recoup college</Text>
              <Text style={[styles.resultValue, { color: COLORS.neonPink }]}>
                {yearsToRecoup} years
              </Text>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>IHC total (4 years)</Text>
              <Text style={[styles.resultValue, { color: COLORS.neonCyan }]}>
                ${ihcCost.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomBanner}>
          <Ionicons name="trending-up" size={24} color={COLORS.neonGreen} />
          <Text style={styles.bannerText}>
            Self-taught devs earn 20% more on average within 5 years. The data is clear.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neonPink + '40',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.neonYellow,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  compareCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  compareTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  compareMethod: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginLeft: 10,
  },
  verdictBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verdictText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  compareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  compareItem: {
    width: '50%',
    marginBottom: 8,
  },
  compareLabel: {
    color: COLORS.textDim,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  compareValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.neonPink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  calcCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  inputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.textDim + '30',
  },
  resultBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  resultDivider: {
    height: 1,
    backgroundColor: COLORS.textDim + '20',
    marginVertical: 8,
  },
  bottomBanner: {
    backgroundColor: COLORS.neonGreen + '10',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.neonGreen + '30',
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    color: COLORS.text,
    fontSize: 13,
    flex: 1,
    marginLeft: 10,
    lineHeight: 18,
  },
});
