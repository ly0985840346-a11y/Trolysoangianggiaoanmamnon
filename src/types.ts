export interface LessonPlan {
  id: string;
  title: string;
  ageGroup: string;
  method: string;
  developmentField: string;
  location?: string;
  teacherName?: string;
  className?: string;
  schoolName?: string;
  teachingDate?: string;
  objectives: {
    knowledge: string[];
    skills: string[];
    attitude: string[];
  };
  preparation: {
    teacher: string[];
    students: string[];
  };
  procedure: {
    step: string;
    teacherActivity: string;
    studentActivity: string;
  }[];
  createdAt: number;
}
