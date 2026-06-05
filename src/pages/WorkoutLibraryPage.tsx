import { Link } from 'react-router-dom';
import WorkoutList from '../components/WorkoutList';

export default function WorkoutLibraryPage() {
  return (
    <div className="pb-32">
      <div className="px-4 pt-5 pb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-5xl leading-[0.9] tracking-[-0.03em]">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #FFD500 0%, #F0E040 35%, #FF9B5C 70%, #FF6B6B 100%)' }}
            >
              Workouts
            </span>
          </h1>
          <p className="text-sm text-muted mt-2">Your own workouts. Build once, log anytime.</p>
        </div>
        <Link to="/workout/new" className="text-xs text-accent shrink-0 pb-1">+ New workout</Link>
      </div>

      <div className="px-4 mt-2">
        <WorkoutList />
      </div>
    </div>
  );
}
