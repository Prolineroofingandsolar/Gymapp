export type WeekProgress = {
  target: number;
  planned: number;   // future booked classes this week
  completed: number; // attended this week
  met: boolean;
  remaining: number;
};

export function weekProgress(args: { target: number; planned: number; completed: number }): WeekProgress {
  const { target, planned, completed } = args;
  return {
    target,
    planned,
    completed,
    met: completed >= target && target > 0,
    remaining: Math.max(0, target - completed - planned),
  };
}

/**
 * Consecutive completed weeks (most recent completed week first) where the
 * member met their target. A week with no commitment set breaks the streak.
 */
export function commitmentStreak(weeks: { target: number | null; completed: number }[]): number {
  let streak = 0;
  for (const w of weeks) {
    if (w.target == null || w.target <= 0) break;
    if (w.completed >= w.target) streak++;
    else break;
  }
  return streak;
}

export const STREAK_MILESTONES = [4, 8, 12, 26, 52];

export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}
