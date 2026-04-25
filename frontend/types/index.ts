export interface Department {
  id: number;
  name: string;
  code: string;
  university: string;
  _count?: { instructors: number; courses: number };
}

export interface Instructor {
  id: number;
  name: string;
  title: string;
  email?: string;
  photoUrl?: string;
  avesisUrl?: string;
  departmentId: number;
  department?: Department;
  slug: string;
  reviews?: Review[];
  avgClarity?: number;
  avgFairness?: number;
  avgWorkload?: number;
  avgOverall?: number;
  totalReviews?: number;
  wouldRetakePercent?: number;
  attendancePercent?: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  credits?: number;
  departmentId: number;
  department?: Department;
  sections?: CourseSection[];
}

export interface CourseSection {
  id: number;
  courseId: number;
  instructorId: number;
  semester: string;
  course?: Course;
  instructor?: Instructor;
}

export interface User {
  id: number;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Review {
  id: number;
  instructorId: number;
  courseId: number;
  userId: number;
  semester: string;
  clarity: number;
  fairness: number;
  workload: number;
  attendance: boolean;
  wouldRetake: boolean;
  comment: string;
  upvotes: number;
  downvotes: number;
  isAnonymous: boolean;
  createdAt: string;
  instructor?: Instructor;
  course?: Course;
}

export interface Stats {
  totalInstructors: number;
  totalReviews: number;
  totalDepartments: number;
  totalCourses: number;
  avgOverallRating: number;
}
