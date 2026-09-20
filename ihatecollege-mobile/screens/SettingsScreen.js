import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#0a0a0f',
  card: '#12121a',
  neonPink: '#ff2d7b',
  neonCyan: '#00f0ff',
  neonGreen: '#39ff14',
  neonPurple: '#bf00ff',
  text: '#e0e0e0',
  textDim: '#6b6b8d',
};

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [hardMode, setHardMode] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <Text style={styles.headerSubtitle}>Customize your rebellion.</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={COLORS.neonCyan} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Rebel Dev</Text>
            <Text style={styles.profileEmail}>rebel@ihatecollege.com</Text>
            <View style={styles.planBadge}>
              <Ionicons name="flame" size={14} color={COLORS.neonPink} />
              <Text style={styles.planText}>PRO MEMBER</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textDim} />
        </View>

        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={20} color={COLORS.neonPurple} />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: COLORS.textDim + '40', true: COLORS.neonCyan + '60' }}
              thumbColor={darkMode ? COLORS.neonCyan : COLORS.textDim}
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={20} color={COLORS.neonPink} />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: COLORS.textDim + '40', true: COLORS.neonPink + '60' }}
              thumbColor={notifications ? COLORS.neonPink : COLORS.textDim}
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={20} color={COLORS.neonGreen} />
              <Text style={styles.settingLabel}>Sounds</Text>
            </View>
            <Switch
              value={sounds}
              onValueChange={setSounds}
              trackColor={{ false: COLORS.textDim + '40', true: COLORS.neonGreen + '60' }}
              thumbColor={sounds ? COLORS.neonGreen : COLORS.textDim}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>LEARNING</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="skull" size={20} color={COLORS.neonPink} />
              <Text style={styles.settingLabel}>Hard Mode</Text>
            </View>
            <Switch
              value={hardMode}
              onValueChange={setHardMode}
              trackColor={{ false: COLORS.textDim + '40', true: COLORS.neonPink + '60' }}
              thumbColor={hardMode ? COLORS.neonPink : COLORS.textDim}
            />
          </View>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="target" size={20} color={COLORS.neonYellow} />
              <Text style={styles.settingLabel}>Daily Goal</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>2 lessons/day</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
            </View>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="trophy" size={20} color={COLORS.neonCyan} />
              <Text style={styles.settingLabel}>Reminders</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>8:00 AM</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="card" size={20} color={COLORS.neonGreen} />
              <Text style={styles.settingLabel}>Subscription</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={[styles.settingValue, { color: COLORS.neonGreen }]}>Active</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
            </View>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="download" size={20} color={COLORS.neonCyan} />
              <Text style={styles.settingLabel}>Export Progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </TouchableOpacity>
          <View style={styles.settingDivider} />
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="log-out" size={20} color={COLORS.neonPink} />
              <Text style={[styles.settingLabel, { color: COLORS.neonPink }]}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.neonPink} />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>IHateCollege v1.0.0</Text>
        <Text style={styles.motto}>College is a trap. You escaped.</Text>
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
    color: COLORS.neonPurple,
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.neonCyan + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: COLORS.neonPink + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  planText: {
    color: COLORS.neonPink,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 4,
  },
  sectionTitle: {
    color: COLORS.neonPink,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: COLORS.textDim,
    fontSize: 14,
    marginRight: 6,
  },
  settingDivider: {
    height: 1,
    backgroundColor: COLORS.textDim + '15',
    marginLeft: 48,
  },
  version: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  motto: {
    color: COLORS.neonPink,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '700',
    marginBottom: 20,
  },
});
