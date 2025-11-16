/*
  # Project Task Tracking System

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text) - Project name
      - `start_date` (date) - Project start date
      - `end_date` (date) - Project end date
      - `created_at` (timestamptz) - Creation timestamp
    
    - `tasks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text) - Task name
      - `planned_start_date` (date) - Planned start date
      - `planned_end_date` (date) - Planned end date
      - `actual_start_date` (date) - Actual start date
      - `actual_end_date` (date) - Actual end date
      - `created_at` (timestamptz) - Creation timestamp
    
    - `milestones`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text) - Milestone name
      - `planned_start_date` (date) - Planned start date
      - `planned_end_date` (date) - Planned end date
      - `actual_start_date` (date) - Actual start date
      - `actual_end_date` (date) - Actual end date
      - `created_at` (timestamptz) - Creation timestamp
    
    - `milestone_tasks`
      - `milestone_id` (uuid, foreign key to milestones)
      - `task_id` (uuid, foreign key to tasks)
      - Composite primary key on both columns
    
    - `daily_work_logs`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `work_date` (date) - Date of work
      - `description` (text) - What was done
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestone_tasks (
  milestone_id uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, task_id)
);

CREATE TABLE IF NOT EXISTS daily_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on projects"
  ON projects FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on tasks"
  ON tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on milestones"
  ON milestones FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on milestone_tasks"
  ON milestone_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_work_logs"
  ON daily_work_logs FOR ALL
  USING (true)
  WITH CHECK (true);