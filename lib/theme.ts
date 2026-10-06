export const COLORS = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  accent: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
  },
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
};

export const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  amazing: { emoji: '🤩', label: 'Amazing', color: '#10B981', bg: '#ECFDF5' },
  good: { emoji: '😊', label: 'Good', color: '#3B82F6', bg: '#EFF6FF' },
  okay: { emoji: '😐', label: 'Okay', color: '#F59E0B', bg: '#FFFBEB' },
  low: { emoji: '😔', label: 'Low', color: '#8B5CF6', bg: '#F5F3FF' },
  rough: { emoji: '😢', label: 'Rough', color: '#EF4444', bg: '#FEF2F2' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#D97706', bg: '#FFFBEB' },
  low: { label: 'Low', color: '#059669', bg: '#ECFDF5' },
};

export const HABIT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1',
];

export const HABIT_ICONS = [
  'CheckCircle', 'Dumbbell', 'BookOpen', 'Droplet',
  'Heart', 'Brain', 'Coffee', 'Moon',
  'Footprints', 'Apple', 'PencilLine', 'Music',
];
