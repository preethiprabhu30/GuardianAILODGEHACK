export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  priority: Priority;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Mood = 'amazing' | 'good' | 'okay' | 'low' | 'rough';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly';
  target_count: number;
  archived: boolean;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  logged_date: string;
  count: number;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  mood: Mood;
  title: string | null;
  content: string | null;
  tags: string[];
  entry_date: string;
  created_at: string;
  updated_at: string;
}
