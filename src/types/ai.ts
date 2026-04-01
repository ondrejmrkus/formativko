import type { LevelDescriptor } from "@/constants/goalLevels";

export interface SuggestedGoal {
  title: string;
  description: string;
  criteria: {
    description: string;
    level_descriptors: LevelDescriptor[];
  }[];
}

export interface SuggestedLesson {
  title: string;
  planned_activities: string;
  observation_focus: string;
}
