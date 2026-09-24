import { Question } from '../data/questions';
import { GradeLevel } from '../types/exam';
import { getOfflineQuestions } from './offlineStorage';

/**
 * Fisher-Yates (Knuth) Shuffle algorithm
 * Shuffles an array in place with uniform probability O(n)
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Extracts 40 unique questions from the pool according to the chosen Grade Level
 * using Fisher-Yates randomization. Supports full offline retrieval.
 */
export function generateExamQuestions(gradeLevel: GradeLevel, count: number = 40): Question[] {
  const pool = getOfflineQuestions();
  // Filter questions that are targeted to the candidate's grade level
  const eligibleQuestions = pool.filter(q => q.targetGrades.includes(gradeLevel));
  
  // If pool has fewer than desired count, fallback to all pool
  const candidatePool = eligibleQuestions.length >= count ? eligibleQuestions : pool;
  
  // Shuffle candidate pool
  const shuffled = fisherYatesShuffle(candidatePool);
  
  // Slice exactly the requested count (40 questions)
  const selected = shuffled.slice(0, count);
  
  return selected.map((q) => {
    return { ...q };
  });
}
