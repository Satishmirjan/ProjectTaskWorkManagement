export interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  created_at: string;
}

export interface DailyWorkLog {
  id: string;
  task_id: string;
  work_date: string;
  description: string;
  created_at: string;
}

export interface MilestoneTask {
  milestone_id: string;
  task_id: string;
}
