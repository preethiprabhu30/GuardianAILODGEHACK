import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { COLORS, MOOD_CONFIG } from '@/lib/theme';
import { greeting, todayStr, last7Days, dayLabel, dayNumber, prettyDate } from '@/lib/dates';
import type { Task, Habit, HabitLog, JournalEntry, Mood } from '@/lib/types';
import { CheckCircle2, Circle, Flame, TrendingUp, ChevronRight, Sparkles } from 'lucide-react-native';

export default function TodayScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const today = todayStr();
    const [tasksRes, habitsRes, logsRes, journalRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('completed', false).order('due_date', { ascending: true }).limit(10),
      supabase.from('habits').select('*').eq('archived', false).order('created_at', { ascending: true }),
      supabase.from('habit_logs').select('*').gte('logged_date', last7Days()[0]),
      supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).limit(5),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setHabitLogs(logsRes.data);
    if (journalRes.data) setJournal(journalRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleTask = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    await supabase
      .from('tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', task.id);
  };

  const toggleHabit = async (habit: Habit) => {
    const today = todayStr();
    const existing = habitLogs.find(l => l.habit_id === habit.id && l.logged_date === today);
    if (existing) {
      setHabitLogs(prev => prev.filter(l => l.id !== existing.id));
      await supabase.from('habit_logs').delete().eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habit.id, logged_date: today, count: 1 })
        .select()
        .single();
      if (data) setHabitLogs(prev => [...prev, data]);
    }
  };

  const today = todayStr();
  const todayLogs = habitLogs.filter(l => l.logged_date === today);
  const habitsDone = todayLogs.length;
  const habitsTotal = habits.length;
  const tasksCount = tasks.length;
  const todayJournal = journal.find(j => j.entry_date === today);

  const weekDays = last7Days();
  const completedPerDay = weekDays.map(d => habitLogs.filter(l => l.logged_date === d).length);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.date}>{prettyDate(today)}</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Sparkles size={24} color={COLORS.primary[600]} strokeWidth={2.2} />
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{habitsDone}</Text>
                <Text style={styles.heroStatLabel}>Habits</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{tasksCount}</Text>
                <Text style={styles.heroStatLabel}>Tasks</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{todayJournal ? MOOD_CONFIG[todayJournal.mood].emoji : '—'}</Text>
                <Text style={styles.heroStatLabel}>Mood</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((d, i) => {
            const isToday = d === today;
            const count = completedPerDay[i];
            return (
              <View key={d} style={styles.weekDayWrap}>
                <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelActive]}>{dayLabel(d)}</Text>
                <View style={[styles.weekDayCircle, isToday && styles.weekDayCircleActive, count > 0 && styles.weekDayCircleDone]}>
                  <Text style={[styles.weekDayNum, isToday && styles.weekDayNumActive, count > 0 && styles.weekDayNumDone]}>{dayNumber(d)}</Text>
                </View>
                <View style={styles.weekDotRow}>
                  {count > 0 && <View style={styles.weekDot} />}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Habits</Text>
            <Pressable onPress={() => router.push('/(tabs)/habits')}>
              <ChevronRight size={20} color={COLORS.neutral[400]} strokeWidth={2.2} />
            </Pressable>
          </View>
          {habits.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => router.push('/(tabs)/habits')}>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptySub}>Tap to create your first habit</Text>
            </Pressable>
          ) : (
            habits.map(habit => {
              const isDone = todayLogs.some(l => l.habit_id === habit.id);
              return (
                <Pressable
                  key={habit.id}
                  style={({ pressed }) => [styles.habitRow, pressed && styles.pressed]}
                  onPress={() => toggleHabit(habit)}
                >
                  <View style={styles.habitRowLeft}>
                    {isDone ? (
                      <CheckCircle2 size={24} color={habit.color} strokeWidth={2.2} fill={habit.color} />
                    ) : (
                      <Circle size={24} color={COLORS.neutral[300]} strokeWidth={2} />
                    )}
                    <Text style={[styles.habitName, isDone && styles.habitNameDone]}>{habit.name}</Text>
                  </View>
                  <View style={[styles.habitBadge, { backgroundColor: habit.color + '20' }]}>
                    <Text style={[styles.habitBadgeText, { color: habit.color }]}>{habit.frequency === 'daily' ? 'Daily' : 'Weekly'}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Tasks</Text>
            <Pressable onPress={() => router.push('/(tabs)/tasks')}>
              <ChevronRight size={20} color={COLORS.neutral[400]} strokeWidth={2.2} />
            </Pressable>
          </View>
          {tasks.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => router.push('/(tabs)/tasks')}>
              <Text style={styles.emptyTitle}>All clear!</Text>
              <Text style={styles.emptySub}>No pending tasks. Tap to add one.</Text>
            </Pressable>
          ) : (
            tasks.slice(0, 5).map(task => (
              <Pressable
                key={task.id}
                style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}
                onPress={() => toggleTask(task)}
              >
                <Circle size={22} color={COLORS.neutral[300]} strokeWidth={2} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={[styles.taskDue, task.due_date < today && styles.taskOverdue]}>{task.due_date}</Text>
                  )}
                </View>
                <View style={[styles.priorityDot, { backgroundColor: task.priority === 'high' ? COLORS.error[500] : task.priority === 'medium' ? COLORS.warning[500] : COLORS.success[500] }]} />
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Journal</Text>
            <Pressable onPress={() => router.push('/(tabs)/journal')}>
              <ChevronRight size={20} color={COLORS.neutral[400]} strokeWidth={2.2} />
            </Pressable>
          </View>
          {journal.length === 0 ? (
            <Pressable style={styles.emptyCard} onPress={() => router.push('/(tabs)/journal')}>
              <Text style={styles.emptyTitle}>Start journaling</Text>
              <Text style={styles.emptySub}>Log your mood and reflect on your day</Text>
            </Pressable>
          ) : (
            journal.slice(0, 3).map(entry => {
              const cfg = MOOD_CONFIG[entry.mood];
              return (
                <View key={entry.id} style={styles.journalRow}>
                  <Text style={styles.journalEmoji}>{cfg.emoji}</Text>
                  <View style={styles.journalInfo}>
                    <Text style={styles.journalTitle}>{entry.title || cfg.label}</Text>
                    <Text style={styles.journalDate}>{entry.entry_date}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 16, paddingBottom: 20 },
  greeting: { fontSize: 28, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  date: { fontSize: 14, fontFamily: 'Inter-Regular', color: COLORS.neutral[500], marginTop: 4 },
  heroCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  heroStats: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  heroStat: { alignItems: 'center', paddingHorizontal: 16 },
  heroStatNum: { fontSize: 24, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  heroStatLabel: { fontSize: 11, fontFamily: 'Inter-Medium', color: COLORS.neutral[400], marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: COLORS.neutral[200] },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  weekDayWrap: { alignItems: 'center', flex: 1 },
  weekDayLabel: { fontSize: 11, fontFamily: 'Inter-Medium', color: COLORS.neutral[400], marginBottom: 6 },
  weekDayLabelActive: { color: COLORS.primary[600] },
  weekDayCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center', justifyContent: 'center',
  },
  weekDayCircleActive: { backgroundColor: COLORS.primary[600] },
  weekDayCircleDone: { borderWidth: 2, borderColor: COLORS.success[500] },
  weekDayNum: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600] },
  weekDayNumActive: { color: COLORS.neutral[0] },
  weekDayNumDone: { color: COLORS.neutral[700] },
  weekDotRow: { height: 8, marginTop: 4 },
  weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success[500] },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[800] },
  emptyCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[700] },
  emptySub: { fontSize: 13, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], marginTop: 4 },
  habitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.neutral[0],
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  habitRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitName: { fontSize: 15, fontFamily: 'Inter-Medium', color: COLORS.neutral[800] },
  habitNameDone: { color: COLORS.neutral[400], textDecorationLine: 'line-through' },
  habitBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  habitBadgeText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.neutral[0],
    borderRadius: 14, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontFamily: 'Inter-Medium', color: COLORS.neutral[800] },
  taskDue: { fontSize: 12, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], marginTop: 2 },
  taskOverdue: { color: COLORS.error[500] },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  journalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.neutral[0],
    borderRadius: 14, padding: 14, marginBottom: 8,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  journalEmoji: { fontSize: 24 },
  journalInfo: { flex: 1 },
  journalTitle: { fontSize: 15, fontFamily: 'Inter-Medium', color: COLORS.neutral[800] },
  journalDate: { fontSize: 12, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], marginTop: 2 },
  pressed: { opacity: 0.7 },
});
