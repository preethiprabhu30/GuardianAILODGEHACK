import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, PRIORITY_CONFIG } from '@/lib/theme';
import { todayStr, relativeDate } from '@/lib/dates';
import type { Task, Priority } from '@/lib/types';
import { CheckCircle2, Circle, Plus, Trash2, X, Flag } from 'lucide-react-native';

type Filter = 'all' | 'pending' | 'completed';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDate, setNewDate] = useState('');
  const [adding, setAdding] = useState(false);

  const loadTasks = useCallback(async () => {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('completed', false);
    else if (filter === 'completed') query = query.eq('completed', true);
    const { data } = await query;
    if (data) setTasks(data);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const toggleTask = async (task: Task) => {
    const completed = !task.completed;
    setTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t)
    );
    await supabase
      .from('tasks')
      .update({ completed, completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', task.id);
    if (filter !== 'all') loadTasks();
  };

  const deleteTask = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    await supabase.from('tasks').delete().eq('id', task.id);
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { data } = await supabase
      .from('tasks')
      .insert({
        title: newTitle.trim(),
        priority: newPriority,
        due_date: newDate || null,
      })
      .select()
      .single();
    if (data) {
      setTasks(prev => [data, ...prev]);
      setNewTitle('');
      setNewPriority('medium');
      setNewDate('');
      setShowAdd(false);
    }
    setAdding(false);
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Done' },
    { key: 'all', label: 'All' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Plus size={22} color={COLORS.neutral[0]} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Circle size={32} color={COLORS.neutral[300]} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'pending' ? 'No pending tasks' : filter === 'completed' ? 'Nothing completed yet' : 'No tasks yet'}
            </Text>
            <Text style={styles.emptySub}>Tap the + button to add a task</Text>
          </View>
        ) : (
          tasks.map(task => {
            const cfg = PRIORITY_CONFIG[task.priority];
            return (
              <View key={task.id} style={styles.taskCard}>
                <Pressable onPress={() => toggleTask(task)} style={styles.taskCheck}>
                  {task.completed ? (
                    <CheckCircle2 size={24} color={COLORS.success[500]} strokeWidth={2.2} fill={COLORS.success[500]} />
                  ) : (
                    <Circle size={24} color={COLORS.neutral[300]} strokeWidth={2} />
                  )}
                </Pressable>
                <View style={styles.taskBody}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskDone]}>{task.title}</Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.priorityBadge, { backgroundColor: cfg.bg }]}>
                      <Flag size={10} color={cfg.color} strokeWidth={2.5} />
                      <Text style={[styles.priorityText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {task.due_date && (
                      <Text style={[styles.dueText, task.due_date < todayStr() && !task.completed && styles.dueOverdue]}>
                        {relativeDate(task.due_date)}
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable onPress={() => deleteTask(task)} style={styles.deleteBtn}>
                  <Trash2 size={18} color={COLORS.neutral[300]} strokeWidth={2} />
                </Pressable>
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
              <Text style={styles.modalTitle}>New Task</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={22} color={COLORS.neutral[400]} strokeWidth={2.2} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor={COLORS.neutral[400]}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as Priority[]).map(p => {
                const c = PRIORITY_CONFIG[p];
                return (
                  <Pressable
                    key={p}
                    style={[styles.priorityOption, newPriority === p && { backgroundColor: c.bg, borderColor: c.color }]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text style={[styles.priorityOptionText, newPriority === p && { color: c.color }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.inputLabel}>Due date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.neutral[400]}
              value={newDate}
              onChangeText={setNewDate}
              keyboardType="numbers-and-punctuation"
            />
            <Pressable style={styles.saveBtn} onPress={addTask} disabled={adding || !newTitle.trim()}>
              <Text style={styles.saveBtnText}>{adding ? 'Adding...' : 'Add Task'}</Text>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: COLORS.neutral[100],
  },
  filterBtnActive: { backgroundColor: COLORS.primary[600] },
  filterText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[500] },
  filterTextActive: { color: COLORS.neutral[0] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600] },
  emptySub: { fontSize: 14, fontFamily: 'Inter-Regular', color: COLORS.neutral[400], marginTop: 4 },
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.neutral[0],
    borderRadius: 16, padding: 14, marginBottom: 8,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCheck: { padding: 4 },
  taskBody: { flex: 1, marginLeft: 10 },
  taskTitle: { fontSize: 15, fontFamily: 'Inter-Medium', color: COLORS.neutral[800] },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.neutral[400] },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontFamily: 'Inter-SemiBold' },
  dueText: { fontSize: 12, fontFamily: 'Inter-Regular', color: COLORS.neutral[400] },
  dueOverdue: { color: COLORS.error[500] },
  deleteBtn: { padding: 8 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
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
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  priorityOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.neutral[200],
    alignItems: 'center',
  },
  priorityOptionText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[500] },
  saveBtn: {
    backgroundColor: COLORS.primary[600],
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[0] },
});
