import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AI_PICKS = [
  {
    id: '1',
    pick: 'Lakers -4.5',
    game: 'LAL vs BOS',
    confidence: 92,
    reasoning: 'Lakers have won 8 of last 10 at home. Celtics on back-to-back.',
    odds: '-110',
    sport: 'NBA',
    starRating: 5,
  },
  {
    id: '2',
    pick: 'Chiefs ML',
    game: 'KC vs BUF',
    confidence: 87,
    reasoning: 'Mahomes 14-2 in primetime. Bills missing 2 starting CBs.',
    odds: '-145',
    sport: 'NFL',
    starRating: 4,
  },
  {
    id: '3',
    pick: 'Over 8.5',
    game: 'NYY vs BOS',
    confidence: 78,
    reasoning: 'Both starters have ERA over 4.20 in last 5 starts.',
    odds: '-105',
    sport: 'MLB',
    starRating: 3,
  },
  {
    id: '4',
    pick: 'Panthers +1.5',
    game: 'EDM vs FLA',
    confidence: 81,
    reasoning: 'Panthers 7-2 at home this season. Bobrovsky expected start.',
    odds: '-115',
    sport: 'NHL',
    starRating: 4,
  },
  {
    id: '5',
    pick: 'Liverpool ML',
    game: 'MCI vs LIV',
    confidence: 69,
    reasoning: 'Liverpool unbeaten in 12. City have injury concerns.',
    odds: '+140',
    sport: 'Soccer',
    starRating: 3,
  },
];

function ConfidenceCircle({ confidence }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <View style={styles.confCircleOuter}>
      <View style={styles.confCircle}>
        <Text style={styles.confNum}>{confidence}</Text>
      </View>
      <Text style={styles.confLabel}>AI</Text>
    </View>
  );
}

function StarRating({ count }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= count ? 'star' : 'star-outline'}
          size={12}
          color="#FFD700"
        />
      ))}
    </View>
  );
}

export default function PicksScreen() {
  const [tracked, setTracked] = useState({});

  const handleTrack = (id) => {
    setTracked((prev) => ({ ...prev, [id]: !prev[id] }));
    Alert.alert(
      'Bet Tracked',
      'Added to your tracker. View in Tracker tab.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI PICKS</Text>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={14} color="#0D0D0D" />
          <Text style={styles.badgeText}>GPT-5 Powered</Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {AI_PICKS.map((p) => (
          <View key={p.id} style={styles.pickCard}>
            <View style={styles.cardTop}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{p.sport}</Text>
              </View>
              <StarRating count={p.starRating} />
            </View>

            <View style={styles.cardMain}>
              <View style={styles.pickInfo}>
                <Text style={styles.pickName}>{p.pick}</Text>
                <Text style={styles.pickGame}>{p.game}</Text>
                <Text style={styles.pickReason}>{p.reasoning}</Text>
              </View>
              <ConfidenceCircle confidence={p.confidence} />
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.oddsLabel}>Odds: {p.odds}</Text>
              <TouchableOpacity
                style={[styles.trackBtn, tracked[p.id] && styles.trackBtnActive]}
                onPress={() => handleTrack(p.id)}
              >
                <Ionicons
                  name={tracked[p.id] ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18}
                  color={tracked[p.id] ? '#0D0D0D' : '#00E676'}
                />
                <Text style={[styles.trackBtnText, tracked[p.id] && styles.trackBtnTextActive]}>
                  {tracked[p.id] ? 'Tracked' : 'Track Bet'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  badge: {
    backgroundColor: '#00E676',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: { color: '#0D0D0D', fontSize: 12, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 20 },
  pickCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sportBadge: {
    backgroundColor: '#2A2A3E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: { color: '#00E676', fontSize: 11, fontWeight: '800' },
  stars: { flexDirection: 'row', gap: 2 },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pickInfo: { flex: 1, marginRight: 16 },
  pickName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  pickGame: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  pickReason: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  confCircleOuter: { alignItems: 'center' },
  confCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confNum: { color: '#00E676', fontSize: 18, fontWeight: '900' },
  confLabel: { color: '#6B7280', fontSize: 10, marginTop: 4 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    paddingTop: 14,
  },
  oddsLabel: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00E676',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  trackBtnActive: { backgroundColor: '#00E676' },
  trackBtnText: { color: '#00E676', fontSize: 14, fontWeight: '800' },
  trackBtnTextActive: { color: '#0D0D0D' },
});
