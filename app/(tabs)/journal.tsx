import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, MOOD_CONFIG } from '@/lib/theme';
import { todayStr, prettyDate } from '@/lib/dates';
import type { JournalEntry, Mood } from '@/lib/types';
import { Plus, X, Trash2, Calendar } from 'lucide-react-native';

const MOODS: Mood[] = ['amazing', 'good', 'okay', 'low', 'rough'];

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood>('good');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .order('entry_date', { ascending: false });
    if (data) setEntries(data);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const saveEntry = async () => {
    setAdding(true);
    const { data } = await supabase
      .from('journal_entries')
      .insert({
        mood: selectedMood,
        title: title.trim() || null,
        content: content.trim() || null,
        tags,
        entry_date: todayStr(),
      })
      .select()
      .single();
    if (data) {
      setEntries(prev => [data, ...prev]);
      resetForm();
      setShowAdd(false);
    }
    setAdding(false);
  };

  const resetForm = () => {
    setSelectedMood('good');
    setTitle('');
    setContent('');
    setTags([]);
    setTagInput('');
  };

  const deleteEntry = async (entry: JournalEntry) => {
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    await supabase.from('journal_entries').delete().eq('id', entry.id);
  };

  const today = todayStr();
  const todayEntry = entries.find(e => e.entry_date === today);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Pressable style={styles.addBtn} onPress={() => { resetForm(); setShowAdd(true); }}>
          <Plus size={22} color={COLORS.neutral[0]} strokeWidth={2.4} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Calendar size={32} color={COLORS.neutral[300]} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No journal entries</Text>
            <Text style={styles.emptySub}>Reflect on your day. Tap + to start.</Text>
          </View>
        ) : (
          entries.map(entry => {
            const cfg = MOOD_CONFIG[entry.mood];
            return (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View style={[styles.moodBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.moodEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <View style={styles.entryHeaderRight}>
                    <Text style={styles.entryDate}>{prettyDate(entry.entry_date)}</Text>
                    <Pressable onPress={() => deleteEntry(entry)} style={styles.deleteBtn}>
                      <Trash2 size={16} color={COLORS.neutral[300]} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
                {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
                {entry.content && <Text style={styles.entryContent}>{entry.content}</Text>}
                {entry.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {entry.tags.map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
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
              <Text style={styles.modalTitle}>
                {todayEntry ? 'Update Today' : "How's your day?"}
              </Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={22} color={COLORS.neutral[400]} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Mood</Text>
            <View style={styles.moodRow}>
              {MOODS.map(mood => {
                const cfg = MOOD_CONFIG[mood];
                const selected = selectedMood === mood;
                return (
                  <Pressable
                    key={mood}
                    style={[styles.moodOption, selected && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={styles.moodOptionEmoji}>{cfg.emoji}</Text>
                    <Text style={[styles.moodOptionLabel, selected && { color: cfg.color }]}>{cfg.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Title (optional)"
              placeholderTextColor={COLORS.neutral[400]}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What happened today? How do you feel?"
              placeholderTextColor={COLORS.neutral[400]}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, styles.tagInput]}
                placeholder="Add a tag..."
                placeholderTextColor={COLORS.neutral[400]}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
              <Pressable style={styles.tagAddBtn} onPress={addTag}>
                <Plus size={18} color={COLORS.neutral[0]} strokeWidth={2.4} />
              </Pressable>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map(tag => (
                  <Pressable key={tag} style={styles.tag} onPress={() => removeTag(tag)}>
                    <Text style={styles.tagText}>#{tag}</Text>
                    <X size={12} color={COLORS.neutral[400]} strokeWidth={2.4} />
                  </Pressable>
                ))}
              </View>
            )}

            <Pressable style={styles.saveBtn} onPress={saveEntry} disabled={adding}>
              <Text style={styles.saveBtnText}>{adding ? 'Saving...' : 'Save Entry'}</Text>
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
  entryCard: {
    backgroundColor: COLORS.neutral[0],
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: COLORS.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  moodEmoji: { fontSize: 18 },
  moodLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  entryHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryDate: { fontSize: 12, fontFamily: 'Inter-Regular', color: COLORS.neutral[400] },
  deleteBtn: { padding: 4 },
  entryTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[800], marginBottom: 6 },
  entryContent: { fontSize: 14, fontFamily: 'Inter-Regular', color: COLORS.neutral[600], lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.neutral[100], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: 'Inter-Medium', color: COLORS.neutral[500] },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.neutral[0],
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.neutral[200], alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: COLORS.neutral[900] },
  inputLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[600], marginBottom: 8, marginTop: 8 },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  moodOption: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.neutral[200],
    backgroundColor: COLORS.neutral[50],
    alignItems: 'center', gap: 4,
  },
  moodOptionEmoji: { fontSize: 22 },
  moodOptionLabel: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[400] },
  input: {
    borderWidth: 1, borderColor: COLORS.neutral[200], borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    fontFamily: 'Inter-Regular', color: COLORS.neutral[800],
    marginBottom: 8,
  },
  textArea: { minHeight: 80, marginBottom: 12 },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tagInput: { flex: 1, marginBottom: 0 },
  tagAddBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary[600], alignItems: 'center', justifyContent: 'center' },
  saveBtn: { backgroundColor: COLORS.primary[600], borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: COLORS.neutral[0] },
});
