import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

const STATS = [
  { label: 'Paths Enrolled', value: '3', icon: 'map', color: COLORS.neonCyan },
  { label: 'Lessons Done', value: '14', icon: 'book', color: COLORS.neonGreen },
  { label: 'Hours Logged', value: '47', icon: 'time', color: COLORS.neonPurple },
  { label: 'Streak', value: '12d', icon: 'flame', color: COLORS.neonPink },
];

const SKILLS = [
  { name: 'JavaScript', level: 85, color: COLORS.neonYellow },
  { name: 'React', level: 72, color: COLORS.neonCyan },
  { name: 'Python', level: 60, color: COLORS.neonGreen },
  { name: 'Node.js', level: 45, color: COLORS.neonGreen },
  { name: 'SQL', level: 55, color: COLORS.neonPurple },
  { name: 'Git', level: 78, color: COLORS.neonPink },
  { name: 'CSS/Tailwind', level: 90, color: COLORS.neonCyan },
  { name: 'TypeScript', level: 38, color: COLORS.neonOrange },
];

const RECENT = [
  { title: 'React from Zero', path: 'Full-Stack Developer', time: '2h ago', color: COLORS.neonCyan },
  { title: 'NumPy & Pandas', path: 'Data Scientist', time: '5h ago', color: COLORS.neonGreen },
  { title: 'React Native Setup', path: 'Mobile Developer', time: '1d ago', color: COLORS.neonPurple },
];

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR PROGRESS</Text>
        <Text style={styles.headerSubtitle}>Proof that self-teaching works.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>SKILLS ACQUIRED</Text>
        <View style={styles.skillsCard}>
          {SKILLS.map((skill, i) => (
            <View key={i} style={styles.skillRow}>
              <Text style={styles.skillName}>{skill.name}</Text>
              <View style={styles.skillBarBg}>
                <View
                  style={[
                    styles.skillBarFill,
                    { width: `${skill.level}%`, backgroundColor: skill.color },
                  ]}
                />
              </View>
              <Text style={[styles.skillLevel, { color: skill.color }]}>{skill.level}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        {RECENT.map((item, i) => (
          <View key={i} style={styles.activityCard}>
            <View style={[styles.activityDot, { backgroundColor: item.color }]} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityPath}>{item.path}</Text>
            </View>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
        ))}

        <View style={styles.motivCard}>
          <Text style={styles.motivIcon}>🔥</Text>
          <Text style={styles.motivText}>
            You've saved an estimated $120,000 in tuition. Keep going.
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
    color: COLORS.neonGreen,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  statLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: COLORS.neonPink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  skillsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillName: {
    color: COLORS.text,
    width: 90,
    fontSize: 13,
  },
  skillBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.bg,
    borderRadius: 3,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillLevel: {
    fontSize: 12,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  activityPath: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  motivCard: {
    backgroundColor: COLORS.neonPink + '15',
    borderRadius: 14,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.neonPink + '40',
    flexDirection: 'row',
    alignItems: 'center',
  },
  motivIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  motivText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
