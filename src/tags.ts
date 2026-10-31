// The one tagging vocabulary. A workout's "type" is either a built-in HYROX
// type (fixed, defined here) or a user type (editable, stored in the DB); both
// live in one list. Curated plan days map onto the built-ins by category.
// Colors are unique across built-ins, user-type defaults, and the picker
// palette, so a calendar color always means exactly one type.

import type { Category, Intensity, WorkoutType } from './types';

// Negative createdAt sorts built-ins ahead of user types.
export const HYROX_TYPES: Record<Category, WorkoutType> = {
  FOUNDATION: { id: 'type-foundation', name: 'Foundation', color: '#F0E040', createdAt: -5 },
  AEROBIC: { id: 'type-aerobic', name: 'Aerobic', color: '#5BC0EB', createdAt: -4 },
  ENGINE: { id: 'type-engine', name: 'Engine', color: '#FF6B6B', createdAt: -3 },
  POWER: { id: 'type-power', name: 'Power', color: '#9B59B6', createdAt: -2 },
  COMPLETE: { id: 'type-complete', name: 'Complete', color: '#2ECC71', createdAt: -1 },
};

export const BUILTIN_TYPES: WorkoutType[] = Object.values(HYROX_TYPES);

export const isBuiltinType = (id: string): boolean => BUILTIN_TYPES.some((t) => t.id === id);

// Colors offered for user types — none shared with a built-in or OTHER_TYPE.
export const TYPE_PALETTE = ['#FF9F43', '#FF6BB5', '#4ADEDE', '#A3E635', '#C08457', '#E8E8E8'];

// Logged sessions with no resolvable type. Neutral so it never reads as a type.
export const OTHER_TYPE = { name: 'Other', color: '#6B7280' };

// Intensity is a text-only label: color is reserved for type.
export const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];
