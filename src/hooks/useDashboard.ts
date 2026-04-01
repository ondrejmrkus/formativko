import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lesson } from "@/hooks/useLessons";

/**
 * Lessons happening today (ongoing or prepared with today's date).
 */
export function useTodaysLessons() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["dashboard", "todays_lessons", today],
    queryFn: async () => {
      const { data: ongoing, error: e1 } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("status", "ongoing")
        .order("created_at", { ascending: false });
      if (e1) throw e1;

      const { data: prepared, error: e2 } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("status", "prepared")
        .eq("date", today)
        .order("created_at", { ascending: false });
      if (e2) throw e2;

      return [...(ongoing || []), ...(prepared || [])] as Lesson[];
    },
    enabled: !!user,
  });
}

/**
 * Next upcoming prepared lesson (if no lessons today).
 */
export function useNextLesson(skip: boolean) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["dashboard", "next_lesson", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("status", "prepared")
        .gt("date", today)
        .order("date", { ascending: true })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as Lesson) || null;
    },
    enabled: !!user && !skip,
  });
}

/**
 * Count of linked goals per lesson (batch for dashboard lessons).
 */
export function useLessonGoalCounts(lessonIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "lesson_goal_counts", lessonIds],
    queryFn: async () => {
      if (lessonIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("lesson_goals")
        .select("lesson_id, goal_id")
        .in("lesson_id", lessonIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.lesson_id] = (counts[row.lesson_id] || 0) + 1;
      }
      return counts;
    },
    enabled: !!user && lessonIds.length > 0,
  });
}

export interface CourseStudentHeatmap {
  courseId: string;
  courseName: string;
  className: string;
  subjectName: string;
  classId: string;
  totalGoals: number;
  coveredGoals: number;
  students: {
    id: string;
    firstName: string;
    lastName: string;
    proofCount: number;
    /** Mastery summary: "high" = all goals at top level, "mid" = mixed, "low" = any at lowest/unset, "none" = no levels set */
    mastery: "high" | "mid" | "low" | "none";
    /** Number of goals with a level set */
    goalsWithLevel: number;
    /** Lowest level index across all goals (0 = lowest, higher = better). -1 if no levels set */
    lowestLevelIdx: number;
  }[];
}

/**
 * Per-course heatmap: for each course, shows every student with mastery data.
 */
export function useCourseStudentHeatmap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "course_student_heatmap"],
    queryFn: async () => {
      // Courses
      const { data: courses, error: cErr } = await supabase
        .from("courses")
        .select("id, name, class_id, classes(id, name), subjects(id, name)")
        .order("name");
      if (cErr) throw cErr;
      if (!courses || courses.length === 0) return [];

      // Goals with course_id
      const { data: goals, error: gErr } = await supabase
        .from("educational_goals")
        .select("id, course_id")
        .not("course_id", "is", null);
      if (gErr) throw gErr;

      const courseGoals: Record<string, string[]> = {};
      for (const g of goals || []) {
        if (!g.course_id) continue;
        if (!courseGoals[g.course_id]) courseGoals[g.course_id] = [];
        courseGoals[g.course_id].push(g.id);
      }

      const allGoalIds = (goals || []).map((g) => g.id);

      // Proof-goal links (for coveredGoals count and proofCount)
      const proofGoalMap: Record<string, string[]> = {};
      if (allGoalIds.length > 0) {
        const { data: pgData, error: pgErr } = await supabase
          .from("proof_goals")
          .select("proof_id, goal_id")
          .in("goal_id", allGoalIds);
        if (pgErr) throw pgErr;
        for (const pg of pgData || []) {
          if (!proofGoalMap[pg.goal_id]) proofGoalMap[pg.goal_id] = [];
          proofGoalMap[pg.goal_id].push(pg.proof_id);
        }
      }

      // Lesson-based proofs (Path 2)
      const lessonToCourses: Record<string, Set<string>> = {};
      const courseIds = courses.map((c) => c.id);
      const { data: directLessons, error: clErr } = await supabase
        .from("lessons")
        .select("id, course_id")
        .in("course_id", courseIds);
      if (clErr) throw clErr;
      for (const l of directLessons || []) {
        if (!l.course_id) continue;
        if (!lessonToCourses[l.id]) lessonToCourses[l.id] = new Set();
        lessonToCourses[l.id].add(l.course_id);
      }
      if (allGoalIds.length > 0) {
        const { data: lgData, error: lgErr } = await supabase
          .from("lesson_goals")
          .select("lesson_id, goal_id")
          .in("goal_id", allGoalIds);
        if (lgErr) throw lgErr;
        for (const lg of lgData || []) {
          for (const [cId, gIds] of Object.entries(courseGoals)) {
            if (gIds.includes(lg.goal_id)) {
              if (!lessonToCourses[lg.lesson_id]) lessonToCourses[lg.lesson_id] = new Set();
              lessonToCourses[lg.lesson_id].add(cId);
            }
          }
        }
      }

      const allCourseLessonIds = Object.keys(lessonToCourses);
      const courseLessonProofs: Record<string, string[]> = {};
      if (allCourseLessonIds.length > 0) {
        const { data: lpData, error: lpErr } = await supabase
          .from("proofs_of_learning")
          .select("id, lesson_id")
          .in("lesson_id", allCourseLessonIds);
        if (lpErr) throw lpErr;
        for (const p of lpData || []) {
          const cIds = lessonToCourses[p.lesson_id];
          if (!cIds) continue;
          for (const cId of cIds) {
            if (!courseLessonProofs[cId]) courseLessonProofs[cId] = [];
            courseLessonProofs[cId].push(p.id);
          }
        }
      }

      const goalProofIds = Object.values(proofGoalMap).flat();
      const lessonProofIds = Object.values(courseLessonProofs).flat();
      const allProofIds = [...new Set([...goalProofIds, ...lessonProofIds])];

      const proofStudentMap: Record<string, Set<string>> = {};
      if (allProofIds.length > 0) {
        const { data: psData, error: psErr } = await supabase
          .from("proof_students")
          .select("proof_id, student_id")
          .in("proof_id", allProofIds);
        if (psErr) throw psErr;
        for (const ps of psData || []) {
          if (!proofStudentMap[ps.proof_id]) proofStudentMap[ps.proof_id] = new Set();
          proofStudentMap[ps.proof_id].add(ps.student_id);
        }
      }

      // Student goal levels
      const studentGoalLevelMap: Record<string, Record<string, string>> = {};
      if (allGoalIds.length > 0) {
        const { data: sglData, error: sglErr } = await supabase
          .from("student_goal_levels")
          .select("student_id, goal_id, level")
          .in("goal_id", allGoalIds);
        if (sglErr) throw sglErr;
        for (const row of sglData || []) {
          if (!studentGoalLevelMap[row.student_id]) studentGoalLevelMap[row.student_id] = {};
          studentGoalLevelMap[row.student_id][row.goal_id] = row.level;
        }
      }

      // Get level descriptors for each goal (from first criterion)
      const goalLevelNames: Record<string, string[]> = {};
      if (allGoalIds.length > 0) {
        const { data: critData, error: critErr } = await supabase
          .from("evaluation_criteria")
          .select("goal_id, level_descriptors, sort_order")
          .in("goal_id", allGoalIds)
          .order("sort_order", { ascending: true });
        if (critErr) throw critErr;
        for (const c of critData || []) {
          if (!goalLevelNames[c.goal_id] && c.level_descriptors) {
            const descriptors = c.level_descriptors as { level: string; description: string }[];
            goalLevelNames[c.goal_id] = descriptors.map((ld) => ld.level);
          }
        }
      }
      const defaultLevelNames = ["Začínám", "Rozvíjím se", "Ovládám"];

      // Students per class
      const classIds = [...new Set(courses.map((c) => c.class_id))];
      const { data: csData, error: csErr } = await supabase
        .from("class_students")
        .select("class_id, student_id, students(id, first_name, last_name)")
        .in("class_id", classIds);
      if (csErr) throw csErr;

      const classStudents: Record<string, { id: string; first_name: string; last_name: string }[]> = {};
      for (const row of csData || []) {
        const s = (row as any).students;
        if (!s) continue;
        if (!classStudents[row.class_id]) classStudents[row.class_id] = [];
        classStudents[row.class_id].push(s);
      }

      return courses.map((course) => {
        const gIds = courseGoals[course.id] || [];
        const students = classStudents[course.class_id] || [];

        const studentData = students.map((s) => {
          // Proof count
          const proofIds = new Set<string>();
          for (const gId of gIds) {
            for (const pId of proofGoalMap[gId] || []) {
              if (proofStudentMap[pId]?.has(s.id)) proofIds.add(pId);
            }
          }
          for (const pId of courseLessonProofs[course.id] || []) {
            if (proofStudentMap[pId]?.has(s.id)) proofIds.add(pId);
          }

          // Mastery: compute from student_goal_levels
          let goalsWithLevel = 0;
          let lowestLevelIdx = Infinity;
          let highestPossibleIdx = 0;

          for (const gId of gIds) {
            const levelNames = goalLevelNames[gId] || defaultLevelNames;
            const maxIdx = levelNames.length - 1;
            if (maxIdx > highestPossibleIdx) highestPossibleIdx = maxIdx;

            const studentLevel = studentGoalLevelMap[s.id]?.[gId];
            if (studentLevel) {
              goalsWithLevel++;
              const idx = levelNames.indexOf(studentLevel);
              const effectiveIdx = idx >= 0 ? idx : 0;
              if (effectiveIdx < lowestLevelIdx) lowestLevelIdx = effectiveIdx;
            } else {
              // No level = worst
              lowestLevelIdx = -1;
            }
          }

          let mastery: "high" | "mid" | "low" | "none";
          if (gIds.length === 0 || goalsWithLevel === 0) {
            mastery = "none";
            lowestLevelIdx = -1;
          } else if (lowestLevelIdx === -1) {
            mastery = "low"; // some goals have no level
          } else if (lowestLevelIdx === 0) {
            mastery = "low";
          } else if (lowestLevelIdx >= highestPossibleIdx) {
            mastery = "high";
          } else {
            mastery = "mid";
          }

          return {
            id: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            proofCount: proofIds.size,
            mastery,
            goalsWithLevel,
            lowestLevelIdx: lowestLevelIdx === Infinity ? -1 : lowestLevelIdx,
          };
        });

        // Sort: worst mastery first, then by name
        const masteryOrder = { none: 0, low: 1, mid: 2, high: 3 };
        studentData.sort(
          (a, b) =>
            masteryOrder[a.mastery] - masteryOrder[b.mastery] ||
            a.lowestLevelIdx - b.lowestLevelIdx ||
            a.lastName.localeCompare(b.lastName)
        );

        const coveredGoals = gIds.filter(
          (gId) => (proofGoalMap[gId] || []).length > 0
        ).length;

        return {
          courseId: course.id,
          courseName: course.name,
          className: (course.classes as any)?.name || "",
          subjectName: (course.subjects as any)?.name || "",
          classId: course.class_id,
          totalGoals: gIds.length,
          coveredGoals,
          students: studentData,
        } as CourseStudentHeatmap;
      });
    },
    enabled: !!user,
  });
}

/**
 * Whether any proofs of learning exist (for onboarding completion check).
 */
export function useHasProofs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "has_proofs"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("proofs_of_learning")
        .select("*", { count: "exact", head: true })
        .limit(1);
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!user,
  });
}

export interface AttentionItem {
  type: "student_no_levels" | "student_low" | "goal_no_proofs";
  label: string;
  sublabel?: string;
  linkTo: string;
  courseId?: string;
}

/**
 * Items needing teacher attention: students with low/no goal levels, goals without evidence.
 * Returns max 5 items, most urgent first.
 */
export function useAttentionItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "attention_items"],
    queryFn: async () => {
      const items: AttentionItem[] = [];

      // 1. Find students with no goal levels set (across any course)
      const { data: courses, error: cErr } = await supabase
        .from("courses")
        .select("id, name, class_id, subjects(id, name)");
      if (cErr) throw cErr;
      if (!courses || courses.length === 0) return [];

      const { data: goals, error: gErr } = await supabase
        .from("educational_goals")
        .select("id, course_id, title, class_id, subjects(id, name)")
        .not("course_id", "is", null);
      if (gErr) throw gErr;

      const courseGoals: Record<string, typeof goals> = {};
      for (const g of goals || []) {
        if (!g.course_id) continue;
        if (!courseGoals[g.course_id]) courseGoals[g.course_id] = [];
        courseGoals[g.course_id].push(g);
      }

      const allGoalIds = (goals || []).map((g) => g.id);

      // Student goal levels
      const sglMap: Record<string, Set<string>> = {}; // studentId -> set of goalIds with levels
      if (allGoalIds.length > 0) {
        const { data: sglData } = await supabase
          .from("student_goal_levels")
          .select("student_id, goal_id")
          .in("goal_id", allGoalIds);
        for (const row of sglData || []) {
          if (!sglMap[row.student_id]) sglMap[row.student_id] = new Set();
          sglMap[row.student_id].add(row.goal_id);
        }
      }

      // Students per class
      const classIds = [...new Set(courses.map((c) => c.class_id))];
      const { data: csData } = await supabase
        .from("class_students")
        .select("class_id, student_id, students(id, first_name, last_name)")
        .in("class_id", classIds);

      const classStudents: Record<string, { id: string; first_name: string; last_name: string }[]> = {};
      for (const row of csData || []) {
        const s = (row as any).students;
        if (!s) continue;
        if (!classStudents[row.class_id]) classStudents[row.class_id] = [];
        classStudents[row.class_id].push(s);
      }

      // For each course, find students with 0 goal levels set
      for (const course of courses) {
        const cGoals = courseGoals[course.id] || [];
        if (cGoals.length === 0) continue;
        const cGoalIds = cGoals.map((g) => g.id);
        const students = classStudents[course.class_id] || [];

        for (const s of students) {
          const levelsSet = cGoalIds.filter(
            (gId) => sglMap[s.id]?.has(gId)
          ).length;
          if (levelsSet === 0 && cGoals.length > 0) {
            items.push({
              type: "student_no_levels",
              label: `${s.first_name} ${s.last_name}`,
              sublabel: `${course.name} — žádná úroveň u ${cGoals.length} ${cGoals.length === 1 ? "cíle" : "cílů"}`,
              linkTo: `/student-profiles/${s.id}`,
              courseId: course.id,
            });
          }
        }
      }

      // 2. Goals with no proofs
      const { data: proofGoals } = await supabase
        .from("proof_goals")
        .select("goal_id");
      const goalsWithProofs = new Set((proofGoals || []).map((pg) => pg.goal_id));

      for (const g of goals || []) {
        if (!goalsWithProofs.has(g.id)) {
          const course = courses.find((c) => c.id === g.course_id);
          items.push({
            type: "goal_no_proofs",
            label: g.title,
            sublabel: course ? `${course.name} — zatím žádné důkazy` : "Zatím žádné důkazy",
            linkTo: `/goals/${g.id}`,
          });
        }
      }

      // Sort: students without levels first, then goals without proofs
      const typeOrder = { student_no_levels: 0, student_low: 1, goal_no_proofs: 2 };
      items.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

      return items.slice(0, 5);
    },
    enabled: !!user,
  });
}
