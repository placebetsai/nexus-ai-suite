import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LIVE_GAMES = [
  { id: '1', team1: 'LAL', team2: 'BOS', score1: 98, score2: 102, time: 'Q4 3:21', sport: 'NBA' },
  { id: '2', team1: 'KC', team2: 'BUF', score1: 24, score2: 21, time: '4th 8:05', sport: 'NFL' },
  { id: '3', team1: 'NYY', team2: 'BOS', score1: 5, score2: 3, time: '7th In', sport: 'MLB' },
  { id: '4', team1: 'EDM', team2: 'FLA', score1: 2, score2: 1, time: '2nd P', sport: 'NHL' },
];

const TOP_PICKS = [
  { id: '1', pick: 'Lakers -4.5', confidence: 92, game: 'LAL vs BOS', odds: '-110' },
  { id: '2', pick: 'Chiefs ML', confidence: 87, game: 'KC vs BUF', odds: '-145' },
  { id: '3', pick: 'Over 224.5', confidence: 78, game: 'LAL vs BOS', odds: '-105' },
];

export default function HomeScreen() {
  const tickerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      tickerAnim.setValue(width);
      Animated.timing(tickerAnim, {
        toValue: -600,
        duration: 18000,
        useNativeDriver: true,
      }).start(() => animate());
    };
    animate();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>PLACEBETS</Text>
          <Text style={styles.logoDot}>.AI</Text>
        </View>
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
      </View>

      <View style={styles.tickerWrap}>
        <Animated.Text style={[styles.tickerText, { transform: [{ translateX: tickerAnim }] }]}>
          🔴 LIVE: Lakers 98 - 102 Celtics (Q4) &nbsp;&nbsp;|&nbsp;&nbsp;
          Chiefs 24 - 21 Bills (4th) &nbsp;&nbsp;|&nbsp;&nbsp;
          Yankees 5 - 3 Red Sox (7th) &nbsp;&nbsp;|&nbsp;&nbsp;
          Oilers 2 - 1 Panthers (2nd P)
        </Animated.Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>LIVE NOW</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveScroll}>
          {LIVE_GAMES.map((g) => (
            <View key={g.id} style={styles.liveCard}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
              <Text style={styles.sportTag}>{g.sport}</Text>
              <View style={styles.matchRow}>
                <Text style={styles.team}>{g.team1}</Text>
                <Text style={styles.score}>{g.score1}</Text>
              </View>
              <View style={styles.matchRow}>
                <Text style={styles.team}>{g.team2}</Text>
                <Text style={styles.score}>{g.score2}</Text>
              </View>
              <Text style={styles.gameTime}>{g.time}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>TOP AI PICKS TODAY</Text>
        {TOP_PICKS.map((p) => (
          <View key={p.id} style={styles.pickCard}>
            <View style={styles.pickLeft}>
              <Text style={styles.pickText}>{p.pick}</Text>
              <Text style={styles.pickGame}>{p.game}</Text>
            </View>
            <View style={styles.pickRight}>
              <View style={styles.confidenceCircle}>
                <Text style={styles.confidenceNum}>{p.confidence}%</Text>
              </View>
              <Text style={styles.oddsText}>{p.odds}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.trackAllBtn}>
          <Ionicons name="add-circle-outline" size={20} color="#0D0D0D" />
          <Text style={styles.trackAllBtnText}>Track All Picks</Text>
        </TouchableOpacity>

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
  logo: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  logoDot: { color: '#00E676', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  tickerWrap: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 10,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  tickerText: { color: '#CCCCCC', fontSize: 13, whiteSpace: 'nowrap' },
  body: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12,
  },
  liveScroll: { marginBottom: 8 },
  liveCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    width: 160,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  liveBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', marginRight: 5 },
  liveBadgeText: { color: '#FF3B30', fontSize: 10, fontWeight: '800' },
  sportTag: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  team: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  score: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  gameTime: { color: '#6B7280', fontSize: 11, marginTop: 6 },
  pickCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  pickLeft: { flex: 1 },
  pickText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  pickGame: { color: '#6B7280', fontSize: 12 },
  pickRight: { alignItems: 'center', marginLeft: 12 },
  confidenceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  confidenceNum: { color: '#00E676', fontSize: 14, fontWeight: '800' },
  oddsText: { color: '#9CA3AF', fontSize: 12 },
  trackAllBtn: {
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  trackAllBtnText: { color: '#0D0D0D', fontSize: 15, fontWeight: '800' },
});
