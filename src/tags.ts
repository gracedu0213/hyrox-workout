// The one tagging vocabulary. A workout's "type" is the built-in HYROX type
// (every curated plan workout) or a user type (editable, stored in the DB);
// both live in one list. Every type has its own color, so a calendar color
// always means exactly one type.
//
// Plan-workout categories (Foundation/Engine/…) are NOT types: they describe a
// curated day on plan pages only and never reach the calendar or picker.

import type { Category, Intensity, WorkoutType } from './types';

// Negative createdAt sorts the built-in ahead of user types.
export const HYROX_TYPE: WorkoutType = { id: 'type-hyrox', name: 'HYROX', color: '#F0E040', createdAt: -1 };

export const BUILTIN_TYPES: WorkoutType[] = [HYROX_TYPE];

export const isBuiltinType = (id: string): boolean => BUILTIN_TYPES.some((t) => t.id === id);

// Logged sessions with no resolvable type. Neutral grey; sorts last.
export const OTHER_TYPE: WorkoutType = { id: 'type-other', name: 'Other', color: '#6B7280', createdAt: Infinity };

// Colors for user types. Excludes the HYROX and Other colors; the picker also
// hides any color another type already uses.
export const TYPE_PALETTE = [
  '#FF9F43', '#FF6BB5', '#4ADEDE', '#2ECC71', '#5BC0EB',
  '#9B59B6', '#FF6B6B', '#A3E635', '#C08457', '#E8E8E8',
];

// Plan-page labels for curated days.
export const CATEGORIES: Record<Category, { name: string; color: string }> = {
  FOUNDATION: { name: 'Foundation', color: '#F0E040' },
  AEROBIC: { name: 'Aerobic', color: '#5BC0EB' },
  ENGINE: { name: 'Engine', color: '#FF6B6B' },
  POWER: { name: 'Power', color: '#9B59B6' },
  COMPLETE: { name: 'Complete', color: '#2ECC71' },
};

// Intensity is a text-only label: color is reserved for type.
export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];
