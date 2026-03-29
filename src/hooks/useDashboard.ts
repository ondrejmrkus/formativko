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
      // Ongoing lessons (always relevant)
      const { data: ongoing, error: e1 } = await supabase
        .from("lessons")
        .select("*, subjects(id, name)")
        .eq("status", "ongoing")
        .order("created_at", { ascending: false });
      if (e1) throw e1;

      // Prepared lessons with today's date
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

export interface StudentProofAlert {
  studentId: string;
  firstName: string;
  lastName: string;
  proofCount: number;
}

/**
 * Students who have zero proofs in the last 30 days.
 */
export function useStudentsWithoutRecentProofs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "students_without_proofs"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // All students
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id, first_name, last_name");
      if (sErr) throw sErr;
      if (!students || students.length === 0) return [];

      // Proofs in last 30 days with their student links
      const { data: recentProofs, error: pErr } = await supabase
        .from("proofs_of_learning")
        .select("id")
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));
      if (pErr) throw pErr;

      const recentProofIds = (recentProofs || []).map((p) => p.id);

      // If there are recent proofs, find which students have them
      const studentsWithProofs = new Set<string>();
      if (recentProofIds.length > 0) {
        const { data: ps, error: psErr } = await supabase
          .from("proof_students")
          .select("student_id")
          .in("proof_id", recentProofIds);
        if (psErr) throw psErr;
        for (const row of ps || []) {
          studentsWithProofs.add(row.student_id);
        }
      }

      return students
        .filter((s) => !studentsWithProofs.has(s.id))
        .map((s) => ({
          studentId: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          proofCount: 0,
        })) as StudentProofAlert[];
    },
    enabled: !!user,
  });
}

/**
 * Educational goals that have zero linked proofs.
 */
export function useGoalsWithoutProofs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "goals_without_proofs"],
    queryFn: async () => {
      // All goals
      const { data: goals, error: gErr } = await supabase
        .from("educational_goals")
        .select("id, title, class_id, subjects(id, name)");
      if (gErr) throw gErr;
      if (!goals || goals.length === 0) return [];

      // All proof_goals
      const { data: proofGoals, error: pgErr } = await supabase
        .from("proof_goals")
        .select("goal_id");
      if (pgErr) throw pgErr;

      const goalsWithProofs = new Set((proofGoals || []).map((pg) => pg.goal_id));

      return goals
        .filter((g) => !goalsWithProofs.has(g.id))
        .map((g) => ({
          id: g.id,
          title: g.title,
          classId: g.class_id,
          subjectName: (g.subjects as any)?.name || null,
        }));
    },
    enabled: !!user,
  });
}

export interface ClassProgress {
  classId: string;
  className: string;
  studentCount: number;
  totalGoals: number;
  goalsWithProofs: number;
}

/**
 * Per-class goal coverage: how many goals have at least 1 proof.
 */
export function useClassGoalCoverage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "class_goal_coverage"],
    queryFn: async () => {
      // Classes
      const { data: classes, error: cErr } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");
      if (cErr) throw cErr;
      if (!classes || classes.length === 0) return [];

      // Student counts per class
      const { data: csData, error: csErr } = await supabase
        .from("class_students")
        .select("class_id");
      if (csErr) throw csErr;
      const studentCounts: Record<string, number> = {};
      for (const row of csData || []) {
        studentCounts[row.class_id] = (studentCounts[row.class_id] || 0) + 1;
      }

      // All goals with class_id
      const { data: goals, error: gErr } = await supabase
        .from("educational_goals")
        .select("id, class_id");
      if (gErr) throw gErr;

      // proof_goals to know which goals are covered
      const { data: proofGoals, error: pgErr } = await supabase
        .from("proof_goals")
        .select("goal_id");
      if (pgErr) throw pgErr;
      const goalsWithProofs = new Set((proofGoals || []).map((pg) => pg.goal_id));

      // Aggregate per class
      const classGoals: Record<string, { total: number; covered: number }> = {};
      for (const g of goals || []) {
        if (!g.class_id) continue;
        if (!classGoals[g.class_id]) classGoals[g.class_id] = { total: 0, covered: 0 };
        classGoals[g.class_id].total++;
        if (goalsWithProofs.has(g.id)) classGoals[g.class_id].covered++;
      }

      return classes.map((c) => ({
        classId: c.id,
        className: c.name,
        studentCount: studentCounts[c.id] || 0,
        totalGoals: classGoals[c.id]?.total || 0,
        goalsWithProofs: classGoals[c.id]?.covered || 0,
      })) as ClassProgress[];
    },
    enabled: !!user,
  });
}

export interface CourseStudentHeatmap {
  courseId: string;
  courseName: string;
  className: string;
  subjectName: string;
  classId: string;
  students: {
    id: string;
    firstName: string;
    lastName: string;
    proofCount: number; // proofs linked to goals in this course
  }[];
}

/**
 * Per-course heatmap: for each course, shows every student in the class
 * with their proof count linked to that course's goals.
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

      // --- Path 1: proofs linked via goals ---
      const { data: goals, error: gErr } = await supabase
        .from("educational_goals")
        .select("id, course_id")
        .not("course_id", "is", null);
      if (gErr) throw gErr;

      // Map course -> goal ids
      const courseGoals: Record<string, string[]> = {};
      for (const g of goals || []) {
        if (!g.course_id) continue;
        if (!courseGoals[g.course_id]) courseGoals[g.course_id] = [];
        courseGoals[g.course_id].push(g.id);
      }

      const allGoalIds = (goals || []).map((g) => g.id);

      let proofGoalMap: Record<string, string[]> = {}; // goalId -> proofIds
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

      // --- Path 2: proofs linked via lessons ---
      // A lesson connects to a course two ways:
      //   a) lesson.course_id directly
      //   b) lesson_goals → educational_goals.course_id (indirect)
      const lessonToCourses: Record<string, Set<string>> = {}; // lessonId -> courseIds

      // 2a: direct course_id on lessons
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

      // 2b: lessons linked to course goals via lesson_goals
      if (allGoalIds.length > 0) {
        const { data: lgData, error: lgErr } = await supabase
          .from("lesson_goals")
          .select("lesson_id, goal_id")
          .in("goal_id", allGoalIds);
        if (lgErr) throw lgErr;
        for (const lg of lgData || []) {
          // Find which course this goal belongs to
          for (const [cId, gIds] of Object.entries(courseGoals)) {
            if (gIds.includes(lg.goal_id)) {
              if (!lessonToCourses[lg.lesson_id]) lessonToCourses[lg.lesson_id] = new Set();
              lessonToCourses[lg.lesson_id].add(cId);
            }
          }
        }
      }

      const allCourseLessonIds = Object.keys(lessonToCourses);

      // Get proofs linked to those lessons
      const courseLessonProofs: Record<string, string[]> = {}; // courseId -> proofIds
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

      // Collect all proof IDs from both paths
      const goalProofIds = Object.values(proofGoalMap).flat();
      const lessonProofIds = Object.values(courseLessonProofs).flat();
      const allProofIds = [...new Set([...goalProofIds, ...lessonProofIds])];

      // proof_students for those proofs
      let proofStudentMap: Record<string, Set<string>> = {}; // proofId -> studentIds
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

      // Build result per course
      return courses.map((course) => {
        const gIds = courseGoals[course.id] || [];
        const students = classStudents[course.class_id] || [];

        // For each student, count proofs linked to this course via goals OR lessons
        const studentData = students.map((s) => {
          const proofIds = new Set<string>();
          // Path 1: proofs via goals
          for (const gId of gIds) {
            for (const pId of proofGoalMap[gId] || []) {
              if (proofStudentMap[pId]?.has(s.id)) {
                proofIds.add(pId);
              }
            }
          }
          // Path 2: proofs via lessons
          for (const pId of courseLessonProofs[course.id] || []) {
            if (proofStudentMap[pId]?.has(s.id)) {
              proofIds.add(pId);
            }
          }
          return {
            id: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            proofCount: proofIds.size,
          };
        });

        // Sort: fewest proofs first so teacher sees who needs attention
        studentData.sort((a, b) => a.proofCount - b.proofCount || a.lastName.localeCompare(b.lastName));

        return {
          courseId: course.id,
          courseName: course.name,
          className: (course.classes as any)?.name || "",
          subjectName: (course.subjects as any)?.name || "",
          classId: course.class_id,
          students: studentData,
        } as CourseStudentHeatmap;
      });
    },
    enabled: !!user,
  });
}

/**
 * Proofs captured this week (count).
 */
export function useProofsThisWeek() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "proofs_this_week"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count, error } = await supabase
        .from("proofs_of_learning")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());
      if (error) throw error;
      return count || 0;
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
