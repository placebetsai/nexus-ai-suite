import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

const LESSONS_DATA = {
  'Full-Stack Developer': [
    { id: 1, title: 'HTML & CSS Fundamentals', duration: '45 min', completed: true },
    { id: 2, title: 'JavaScript Mastery', duration: '1h 20min', completed: true },
    { id: 3, title: 'React from Zero', duration: '2h', completed: false },
    { id: 4, title: 'Node.js & Express', duration: '1h 45min', completed: false },
    { id: 5, title: 'PostgreSQL Deep Dive', duration: '1h 30min', completed: false },
    { id: 6, title: 'REST API Design', duration: '1h', completed: false },
    { id: 7, title: 'Authentication & JWT', duration: '1h 15min', completed: false },
    { id: 8, title: 'Deploy to Production', duration: '50 min', completed: false },
  ],
  'Data Scientist': [
    { id: 1, title: 'Python for Data', duration: '1h', completed: true },
    { id: 2, title: 'NumPy & Pandas', duration: '1h 30min', completed: false },
    { id: 3, title: 'Data Visualization', duration: '1h 15min', completed: false },
    { id: 4, title: 'Statistics Fundamentals', duration: '2h', completed: false },
    { id: 5, title: 'Machine Learning Basics', duration: '2h 30min', completed: false },
    { id: 6, title: 'Neural Networks', duration: '3h', completed: false },
  ],
  'Cybersecurity Pro': [
    { id: 1, title: 'Networking Basics', duration: '1h', completed: false },
    { id: 2, title: 'Linux Command Line', duration: '1h 30min', completed: false },
    { id: 3, title: 'Ethical Hacking', duration: '2h', completed: false },
    { id: 4, title: 'Penetration Testing', duration: '2h 30min', completed: false },
    { id: 5, title: 'Incident Response', duration: '1h 45min', completed: false },
  ],
  'Mobile Developer': [
    { id: 1, title: 'React Native Setup', duration: '30 min', completed: true },
    { id: 2, title: 'Components & Props', duration: '1h 15min', completed: true },
    { id: 3, title: 'Navigation', duration: '1h', completed: false },
    { id: 4, title: 'State Management', duration: '1h 30min', completed: false },
    { id: 5, title: 'Native APIs', duration: '2h', completed: false },
    { id: 6, title: 'App Store Deploy', duration: '1h', completed: false },
  ],
  'Cloud Architect': [
    { id: 1, title: 'AWS Foundations', duration: '1h 30min', completed: false },
    { id: 2, title: 'EC2 & S3', duration: '1h 45min', completed: false },
    { id: 3, title: 'Docker & K8s', duration: '2h 30min', completed: false },
    { id: 4, title: 'Terraform IaC', duration: '2h', completed: false },
    { id: 5, title: 'CI/CD Pipelines', duration: '1h 30min', completed: false },
  ],
  'UI/UX Designer': [
    { id: 1, title: 'Design Principles', duration: '45 min', completed: false },
    { id: 2, title: 'Figma Mastery', duration: '1h 30min', completed: false },
    { id: 3, title: 'User Research', duration: '1h', completed: false },
    { id: 4, title: 'Prototyping', duration: '1h 45min', completed: false },
    { id: 5, title: 'Design Systems', duration: '2h', completed: false },
  ],
};

export default function LessonsScreen({ route }) {
  const pathName = route?.params?.path?.title || 'Full-Stack Developer';
  const pathColor = route?.params?.path?.color || COLORS.neonCyan;
  const lessons = LESSONS_DATA[pathName] || LESSONS_DATA['Full-Stack Developer'];
  const completed = lessons.filter((l) => l.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: pathColor }]}>{pathName.toUpperCase()}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(completed / lessons.length) * 100}%`,
                backgroundColor: pathColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completed}/{lessons.length} completed
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lessons.map((lesson, index) => (
          <TouchableOpacity
            key={lesson.id}
            style={[styles.lessonCard, lesson.completed && styles.lessonCompleted]}
            activeOpacity={0.7}
          >
            <View style={styles.lessonLeft}>
              <View
                style={[
                  styles.lessonNumber,
                  lesson.completed && { backgroundColor: pathColor + '30' },
                ]}
              >
                {lesson.completed ? (
                  <Ionicons name="checkmark" size={18} color={pathColor} />
                ) : (
                  <Text style={styles.lessonNumberText}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.lessonInfo}>
                <Text
                  style={[
                    styles.lessonTitle,
                    lesson.completed && { color: COLORS.textDim },
                  ]}
                >
                  {lesson.title}
                </Text>
                <View style={styles.lessonMeta}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textDim} />
                  <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={lesson.completed ? pathColor : COLORS.textDim}
            />
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lessonCompleted: {
    borderColor: COLORS.neonCyan + '20',
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  lessonNumberText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 14,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonDuration: {
    color: COLORS.textDim,
    fontSize: 12,
    marginLeft: 4,
  },
});
