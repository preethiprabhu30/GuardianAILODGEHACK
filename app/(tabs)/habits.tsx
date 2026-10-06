import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, HABIT_COLORS, HABIT_ICONS } from '@/lib/theme';
import { todayStr, last7Days, dayLabel } from '@/lib/dates';
import type { Habit, HabitLog } from '@/lib/types';
import {
  CheckCircle2, Circle, Plus, X, Flame, TrendingUp,
  CheckCircle, Dumbbell, BookOpen, Droplet, Heart, Brain,
  Coffee, Moon, Footprints, Apple, PencilLine, Music,
} from 'lucide-react-native';

const ICON_MAP: Record<string, any> = {
  CheckCircle, Dumbbell, BookOpen, Droplet, Heart, Brain,
  Coffee, Moon, Footprints, Apple, PencilLine, Music,
};

function HabitIcon({ name, size, color, strokeWidth }: { name: string; size: number; color: string; strokeWidth: number }) {
  const IconComp = ICON_MAP[name] || CheckCircle;
  return <IconComp size={size} color={color} strokeWidth={strokeWidth} />;
}

function calculateStreak(habitId: string, logs: HabitLog[]): number {
  const habitLogs = logs
    .filter(l => l.habit_id === habitId)
    .map(l => l.logged_date)
    .sort((a, b) => b.localeCompare(a));

  if (habitLogs.length === 0) return 0;

  const today = todayStr();
  if (habitLogs[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (habitLogs[0] !== yStr) return 0;
  }

  let streak = 0;
  let expected = new Date();
  if (habitLogs[0] !== today) {
    expected.setDate(expected.getDate() - 1);
  }
  for (const logDate of habitLogs) {
    const expectedStr = expected.toISOString().slice(0, 10);
    if (logDate === expectedStr) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(HABIT_COLORS[0]);
  const [newIcon, setNewIcon] = useState(HABIT_ICONS[0]);
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly'>('daily');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('archived', false).order('created_at', { ascending: true }),
      supabase.from('habit_logs').select('*').gte('logged_date', last7Days()[0]),
    ]);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleHabit = async (habit: Habit) => {
    const today = todayStr();
    const existing = logs.find(l => l.habit_id === habit.id && l.logged_date === today);
    if (existing) {
      setLogs(prev => prev.filter(l => l.id !== existing.id));
      await supabase.from('habit_logs').delete().eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habit.id, logged_date: today, count: 1 })
        .select()
        .single();
      if (data) setLogs(prev => [...prev, data]);
    }
  };

  const addHabit = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const { data } = await supabase
      .from('habits')
      .insert({
        name: newName.trim(),
        color: newColor,
        icon: newIcon,
        frequency: newFreq,
      })
      .select()
      .single();
    if (data) {
      setHabits(prev => [...prev, data]);
      setNewName('');
      setNewColor(HABIT_COLORS[0]);
      setNewIcon(HABIT_ICONS[0]);
      setNewFreq('daily');
      setShowAdd(false);
    }
    setAdding(false);
  };

  const today = todayStr();
  const weekDays = last7Days();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={22} color={COLORS.neutral[0]} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Flame size={32} color={COLORS.neutral[300]} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySub}>Build consistency. Tap + to start.</Text>
          </View>
        ) : (
          habits.map(habit => {
            const streak = calculateStreak(habit.id, logs);
            const isDone = logs.some(l => l.habit_id === habit.id && l.logged_date === today);
            const weekProgress = weekDays.map(d => logs.some(l => l.habit_id === habit.id && l.logged_date === d));
            const weekCount = weekProgress.filter(Boolean).length;

            return (
              <View key={habit.id} style={styles.habitCard}>
                <View style={styles.habitHeader}>
                  <View style={[styles.habitIconWrap, { backgroundColor: habit.color + '20' }]}>
                    <HabitIcon name={habit.icon} size={20} color={habit.color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <View style={styles.habitMetaRow}>
                      {streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Flame size={12} color={COLORS.warning[500]} strokeWidth={2.2} />
                          <Text style={styles.streakText}>{streak} day{streak !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      <View style={styles.weekCountBadge}>
                        <TrendingUp size={12} color={COLORS.neutral[500]} strokeWidth={2.2} />
                        <Text style={styles.weekCountText}>{weekCount}/7 this week</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={() => toggleHabit(habit)} style={styles.checkBtn}>
                    {isDone ? (
                      <CheckCircle2 size={28} color={habit.color} strokeWidth={2.2} fill={habit.color} />
                    ) : (
                      <Circle size={28} color={COLORS.neutral[300]} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>

                <View style={styles.weekTrack}>
                  {weekDays.map((d, i) => {
                    const isToday = d === today;
                    const done = weekProgress[i];
                    return (
                      <View key={d} style={styles.weekTrackDay}>
                        <Text style={[styles.weekTrackLabel, isToday && styles.weekTrackLabelToday]}>
                          {dayLabel(d)}
                        </Text>
                        <View style={[
                          styles.weekTrackDot,
                          done && { backgroundColor: habit.color },
                          isToday && !done && { borderColor: habit.color, borderWidth: 2 },
                        ]} />
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowAdd(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Habit</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={22} color={COLORS.neutral[400]} strokeWidth={2.2} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Habit name (e.g. Drink water)"
              placeholderTextColor={COLORS.neutral[400]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {HABIT_ICONS.map(icon => (
                <Pressable
                  key={icon}
                  style={[styles.iconOption, newIcon === icon && { backgroundColor: newColor + '20', borderColor: newColor }]}
                  onPress={() => setNewIcon(icon)}
                >
                  <HabitIcon name={icon} size={18} color={newIcon === icon ? newColor : COLORS.neutral[400]} strokeWidth={2.2} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorRow}>
              {HABIT_COLORS.map(color => (
                <Pressable
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, newColor === color && styles.colorOptionSelected]}
                  onPress={() => setNewColor(color)}
                />
              ))}
            </View>
            <Text style={styles.inputLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekly'] as const).map(f => (
                <Pressable
                  key={f}
                  style={[styles.freqOption, newFreq === f && styles.freqOptionActive]}
                  onPress={() => setNewFreq(f)}
                >
                  <Text style={[styles.freqText, newFreq === f && styles.freqTextActive]}>
                    {f === 'daily' ? 'Every day' : 'Every week'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.saveBtn} onPress={addHabit} disabled={adding || !newName.trim()}>
              <Text style={styles.saveBtnText}>{adding ? 'Creating...' : 'Create Habit'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[50] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600] },
  emptySub: { fontSize: 14, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], marginTop: 4 },
  habitCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  habitHeader: { flexDirection: 'row', alignItems: 'center' },
  habitIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitInfo: { flex: 1, marginLeft: 12 },
  habitName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[800] },
  habitMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.warning[50], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  streakText: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: COLORS.warning[600] },
  weekCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.neutral[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  weekCountText: { fontSize: 11, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[500] },
  checkBtn: { padding: 4 },
  weekTrack: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.neutral[100] },
  weekTrackDay: { alignItems: 'center', flex: 1 },
  weekTrackLabel: { fontSize: 10, fontFamily: 'Inter-Medium', color: COLORS.neutral[400], marginBottom: 6 },
  weekTrackLabelToday: { color: COLORS.primary[600], fontFamily: 'Inter-SemiBold' },
  weekTrackDot: { width: 24, height: 24, borderRadius: 8, backgroundColor: COLORS.neutral[100] },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.neutral[200], alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  input: {
    borderWidth: 1, borderColor: COLORS.neutral[200], borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    fontFamily: 'Inter-Regular', color: COLORS.neutral[800],
    marginBottom: 12,
  },
  inputLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600], marginBottom: 8, marginTop: 4 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconOption: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.neutral[100],
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  colorOptionSelected: { borderWidth: 3, borderColor: COLORS.neutral[0], shadowColor: COLORS.neutral[900], shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  freqOption: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.neutral[200], alignItems: 'center' },
  freqOptionActive: { borderColor: COLORS.primary[600], backgroundColor: COLORS.primary[50] },
  freqText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[500] },
  freqTextActive: { color: COLORS.primary[600] },
  saveBtn: { backgroundColor: COLORS.primary[600], borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[0] },
});
