import React from 'react';
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

const COLORS = {
  bg: '#0a0a0f',
  card: '#12121a',
  neonPink: '#ff2d7b',
  neonCyan: '#00f0ff',
  neonGreen: '#39ff14',
  neonPurple: '#bf00ff',
  neonYellow: '#ffe600',
  neonOrange: '#ff6a00',
  text: '#e0e0e0',
  textDim: '#6b6b8d',
};

const PATHS = [
  {
    id: 1,
    title: 'Full-Stack Developer',
    icon: 'code-slash',
    color: COLORS.neonCyan,
    lessons: 48,
    duration: '12 weeks',
    description: 'Build apps from database to UI. No degree needed.',
  },
  {
    id: 2,
    title: 'Data Scientist',
    icon: 'analytics',
    color: COLORS.neonGreen,
    lessons: 42,
    duration: '10 weeks',
    description: 'ML, stats, and Python. Skip the $200k student debt.',
  },
  {
    id: 3,
    title: 'Cybersecurity Pro',
    icon: 'shield-checkmark',
    color: COLORS.neonPink,
    lessons: 36,
    duration: '8 weeks',
    description: 'Protect systems. Earn more than most CS grads.',
  },
  {
    id: 4,
    title: 'Mobile Developer',
    icon: 'phone-portrait',
    color: COLORS.neonPurple,
    lessons: 44,
    duration: '11 weeks',
    description: 'React Native & Swift. Ship apps, not papers.',
  },
  {
    id: 5,
    title: 'Cloud Architect',
    icon: 'cloud',
    color: COLORS.neonYellow,
    lessons: 40,
    duration: '9 weeks',
    description: 'AWS, Azure, DevOps. Six figures without the loans.',
  },
  {
    id: 6,
    title: 'UI/UX Designer',
    icon: 'color-palette',
    color: COLORS.neonOrange,
    lessons: 32,
    duration: '7 weeks',
    description: 'Design interfaces that matter. No art school debt.',
  },
];

export default function PathsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHOOSE YOUR PATH</Text>
        <Text style={styles.headerSubtitle}>College is a scam. Skills are currency.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PATHS.map((path) => (
          <TouchableOpacity
            key={path.id}
            style={[styles.card, { borderColor: path.color }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Lessons', { path })}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconContainer, { backgroundColor: path.color + '20' }]}>
                <Ionicons name={path.icon} size={32} color={path.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: path.color }]}>{path.title}</Text>
                <Text style={styles.cardDesc}>{path.description}</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View style={styles.stat}>
                <Ionicons name="book-outline" size={14} color={COLORS.textDim} />
                <Text style={styles.statText}>{path.lessons} lessons</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={14} color={COLORS.textDim} />
                <Text style={styles.statText}>{path.duration}</Text>
              </View>
              <View style={[styles.startBtn, { backgroundColor: path.color + '30' }]}>
                <Text style={[styles.startBtnText, { color: path.color }]}>START</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    color: COLORS.neonPink,
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textDim,
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.textDim + '20',
    paddingTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: COLORS.textDim,
    fontSize: 12,
    marginLeft: 4,
  },
  startBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
