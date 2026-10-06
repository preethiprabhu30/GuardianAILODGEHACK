import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, MOOD_CONFIG } from '@/lib/theme';
import { last7Days, last30Days, dayLabel, dayNumber } from '@/lib/dates';
import type { Task, Habit, HabitLog, JournalEntry, Mood } from '@/lib/types';
import { Flame, CheckCircle2, TrendingUp, Target, Calendar } from 'lucide-react-native';

export default function InsightsScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [tasksRes, habitsRes, logsRes, journalRes] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('habits').select('*').eq('archived', false),
      supabase.from('habit_logs').select('*').gte('logged_date', last30Days()[0]),
      supabase.from('journal_entries').select('*').gte('entry_date', last30Days()[0]).order('entry_date', { ascending: true }),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    if (journalRes.data) setJournal(journalRes.data);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weekDays = last7Days();
  const weekHabitData = weekDays.map(d => {
    const activeHabits = habits.filter(h => h.frequency === 'daily').length;
    const doneCount = logs.filter(l => l.logged_date === d).length;
    return {
      date: d,
      done: doneCount,
      total: activeHabits || habits.length,
      pct: activeHabits > 0 ? doneCount / activeHabits : 0,
    };
  });

  const totalHabitCompletions = logs.length;
  const bestStreakHabit = habits.map(h => {
    const habitLogs = logs.filter(l => l.habit_id === h.id).map(l => l.logged_date).sort((a, b) => b.localeCompare(a));
    let streak = 0;
    let expected = new Date();
    for (const logDate of habitLogs) {
      const expectedStr = expected.toISOString().slice(0, 10);
      if (logDate === expectedStr) {
        streak++;
        expected.setDate(expected.getDate() - 1);
      } else if (logDate < expectedStr) {
        break;
      }
    }
    return { habit: h, streak };
  }).sort((a, b) => b.streak - a.streak);

  const bestStreak = bestStreakHabit[0]?.streak || 0;
  const bestStreakName = bestStreakHabit[0]?.habit.name || '—';

  const moodCounts: Record<Mood, number> = { amazing: 0, good: 0, okay: 0, low: 0, rough: 0 };
  journal.forEach(e => { moodCounts[e.mood]++; });
  const totalJournal = journal.length;
  const moodDistribution = MOODS.map(m => ({
    mood: m,
    count: moodCounts[m],
    pct: totalJournal > 0 ? moodCounts[m] / totalJournal : 0,
  }));

  const avgMoodScore = totalJournal > 0
    ? journal.reduce((sum, e) => sum + MOOD_SCORES[e.mood], 0) / totalJournal
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success[50] }]}>
              <CheckCircle2 size={20} color={COLORS.success[600]} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNum}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warning[50] }]}>
              <Flame size={20} color={COLORS.warning[500]} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNum}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primary[50] }]}>
              <Target size={20} color={COLORS.primary[600]} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNum}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.accent[100] }]}>
              <Calendar size={20} color={COLORS.accent[600]} strokeWidth={2.2} />
            </View>
            <Text style={styles.statNum}>{totalJournal}</Text>
            <Text style={styles.statLabel}>Journal Entries</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habit Completion (7 days)</Text>
          <View style={styles.barChart}>
            {weekHabitData.map(d => (
              <View key={d.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${Math.max(d.pct * 100, 4)}%`, backgroundColor: d.pct > 0 ? COLORS.primary[500] : COLORS.neutral[200] }]} />
                </View>
                <Text style={styles.barLabel}>{dayLabel(d.date)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mood Distribution (30 days)</Text>
          {totalJournal === 0 ? (
            <Text style={styles.emptyCardText}>No journal entries yet to analyze</Text>
          ) : (
            <View style={styles.moodBars}>
              {moodDistribution.map(m => {
                const cfg = MOOD_CONFIG[m.mood];
                return (
                  <View key={m.mood} style={styles.moodBarRow}>
                    <Text style={styles.moodBarEmoji}>{cfg.emoji}</Text>
                    <View style={styles.moodBarTrack}>
                      <View style={[styles.moodBarFill, { width: `${Math.max(m.pct * 100, 2)}%`, backgroundColor: cfg.color }]} />
                    </View>
                    <Text style={styles.moodBarCount}>{m.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Habit Leaders</Text>
          {bestStreakHabit.length === 0 || bestStreak === 0 ? (
            <Text style={styles.emptyCardText}>Start completing habits to see leaderboards</Text>
          ) : (
            bestStreakHabit.slice(0, 5).map((item, i) => (
              <View key={item.habit.id} style={styles.leaderRow}>
                <View style={[styles.leaderRank, { backgroundColor: i === 0 ? COLORS.warning[100] : COLORS.neutral[100] }]}>
                  <Text style={[styles.leaderRankText, { color: i === 0 ? COLORS.warning[600] : COLORS.neutral[500] }]}>{i + 1}</Text>
                </View>
                <View style={[styles.leaderIcon, { backgroundColor: item.habit.color + '20' }]}>
                  <View style={[styles.leaderIconDot, { backgroundColor: item.habit.color }]} />
                </View>
                <Text style={styles.leaderName}>{item.habit.name}</Text>
                <View style={styles.leaderStreak}>
                  <Flame size={14} color={item.streak > 0 ? COLORS.warning[500] : COLORS.neutral[300]} strokeWidth={2.2} />
                  <Text style={[styles.leaderStreakText, { color: item.streak > 0 ? COLORS.warning[600] : COLORS.neutral[400] }]}>
                    {item.streak}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const MOODS: Mood[] = ['amazing', 'good', 'okay', 'low', 'rough'];
const MOOD_SCORES: Record<Mood, number> = { amazing: 5, good: 4, okay: 3, low: 2, rough: 1 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '46%',
    backgroundColor: COLORS.neutral[0],
    borderRadius: 16, padding: 16,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statNum: { fontSize: 28, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  statLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: COLORS.neutral[400], marginTop: 4 },
  card: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: 18, padding: 18, marginBottom: 16,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[800], marginBottom: 16 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', height: 140, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barTrack: { width: 24, height: 110, backgroundColor: COLORS.neutral[100], borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8, minHeight: 4 },
  barLabel: { fontSize: 10, fontFamily: 'Inter-Medium', color: COLORS.neutral[400], marginTop: 8 },
  emptyCardText: { fontSize: 14, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], textAlign: 'center', paddingVertical: 20 },
  moodBars: { gap: 10 },
  moodBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodBarEmoji: { fontSize: 20, width: 28 },
  moodBarTrack: { flex: 1, height: 24, backgroundColor: COLORS.neutral[100], borderRadius: 8, overflow: 'hidden' },
  moodBarFill: { height: '100%', borderRadius: 8, minHeight: 4 },
  moodBarCount: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600], width: 24, textAlign: 'right' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.neutral[100] },
  leaderRank: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leaderRankText: { fontSize: 13, fontFamily: 'Inter-Bold' },
  leaderIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  leaderIconDot: { width: 12, height: 12, borderRadius: 6 },
  leaderName: { flex: 1, fontSize: 14, fontFamily: 'Inter-Medium', color: COLORS.neutral[700] },
  leaderStreak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderStreakText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
