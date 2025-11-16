import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task, DailyWorkLog, Project } from '../types';
import { Save, Calendar } from 'lucide-react';

export default function DailyWorkPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [recentLogs, setRecentLogs] = useState<(DailyWorkLog & { task_name: string })[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
      loadRecentLogs(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
    } else if (data && data.length > 0) {
      setProjects(data);
      setSelectedProject(data[0]);
    }
  };

  const loadTasks = async (projectId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
    } else if (data) {
      setTasks(data);
      if (data.length > 0 && !selectedTaskId) {
        setSelectedTaskId(data[0].id);
      }
    }
  };

  const loadRecentLogs = async (projectId: string) => {
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);

    if (taskData && taskData.length > 0) {
      const taskIds = taskData.map(t => t.id);

      const { data, error } = await supabase
        .from('daily_work_logs')
        .select('*, tasks(name)')
        .in('task_id', taskIds)
        .order('work_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading recent logs:', error);
      } else if (data) {
        const logsWithTaskNames = data.map(log => ({
          ...log,
          task_name: (log.tasks as unknown as { name: string }).name,
        }));
        setRecentLogs(logsWithTaskNames);
      }
    }
  };

  const saveWorkEntry = async () => {
    if (!selectedTaskId || !description.trim()) {
      alert('Please select a task and enter a description');
      return;
    }

    const { error } = await supabase
      .from('daily_work_logs')
      .insert([{
        task_id: selectedTaskId,
        work_date: workDate,
        description: description.trim(),
      }]);

    if (error) {
      console.error('Error saving work entry:', error);
      alert('Error saving work entry');
    } else {
      alert('Work entry saved successfully!');
      setDescription('');
      if (selectedProject) {
        loadRecentLogs(selectedProject.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Daily Work Entry</h1>

        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">Select Project</h2>
            <select
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
                setSelectedTaskId('');
              }}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedProject && tasks.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                  <Calendar size={20} />
                  Date
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-slate-700 mb-3">
                  Select Task
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                >
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-semibold text-slate-700 mb-3">
                  What You Have Done Today
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: Contacted 5 customers, Completed UI design, etc."
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg resize-none"
                />
              </div>

              <button
                onClick={saveWorkEntry}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-3 text-lg font-semibold"
              >
                <Save size={22} />
                Save Entry
              </button>
            </div>
          </div>
        ) : selectedProject ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-slate-600 text-lg">
              No tasks found for this project. Please create tasks first in the Project & Tasks page.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-slate-600 text-lg">
              No projects found. Please create a project first in the Project & Tasks page.
            </p>
          </div>
        )}

        {recentLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
            <h2 className="text-2xl font-semibold text-slate-700 mb-4">Recent Work Entries</h2>
            <div className="space-y-4">
              {recentLogs.map(log => (
                <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-4 mb-1">
                    <span className="text-sm font-semibold text-slate-600">{log.work_date}</span>
                    <span className="text-sm font-medium text-blue-600">{log.task_name}</span>
                  </div>
                  <p className="text-slate-700">{log.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
