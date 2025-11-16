import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task, DailyWorkLog, Project } from '../types';
import { Search, Filter } from 'lucide-react';

interface WorkLogWithTask extends DailyWorkLog {
  task_name: string;
}

export default function ViewWorkPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workLogs, setWorkLogs] = useState<WorkLogWithTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
      loadWorkLogs();
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
    }
  };

  const loadWorkLogs = async () => {
    if (!selectedProject) return;

    setIsLoading(true);

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', selectedProject.id);

    if (!taskData || taskData.length === 0) {
      setWorkLogs([]);
      setIsLoading(false);
      return;
    }

    const taskIds = taskData.map(t => t.id);

    let query = supabase
      .from('daily_work_logs')
      .select('*, tasks(name)')
      .in('task_id', taskIds);

    if (selectedTaskId && selectedTaskId !== 'all') {
      query = query.eq('task_id', selectedTaskId);
    }

    if (startDate) {
      query = query.gte('work_date', startDate);
    }

    if (endDate) {
      query = query.lte('work_date', endDate);
    }

    query = query.order('work_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading work logs:', error);
    } else if (data) {
      const logsWithTaskNames = data.map(log => ({
        ...log,
        task_name: (log.tasks as unknown as { name: string }).name,
      }));
      setWorkLogs(logsWithTaskNames);
    }

    setIsLoading(false);
  };

  const handleSearch = () => {
    loadWorkLogs();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">View Work History</h1>

        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-700 mb-4">Select Project</h2>
            <select
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project || null);
                setSelectedTaskId('all');
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

        {selectedProject && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Filter size={24} className="text-green-600" />
              <h2 className="text-2xl font-semibold text-slate-700">Filters</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Tasks</option>
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <button
              onClick={handleSearch}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold"
            >
              <Search size={20} />
              Search
            </button>
          </div>
        )}

        {selectedProject && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-slate-700 mb-6">Results</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Loading...</p>
              </div>
            ) : workLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="py-3 px-4 text-left text-slate-600 font-semibold">Date</th>
                      <th className="py-3 px-4 text-left text-slate-600 font-semibold">Task Name</th>
                      <th className="py-3 px-4 text-left text-slate-600 font-semibold">What You Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workLogs.map(log => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-green-50 transition">
                        <td className="py-4 px-4 text-slate-700 font-medium">{log.work_date}</td>
                        <td className="py-4 px-4 text-green-600 font-medium">{log.task_name}</td>
                        <td className="py-4 px-4 text-slate-700">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600 text-lg">
                  No work entries found. Try adjusting your filters or add work entries in the Daily Work Entry page.
                </p>
              </div>
            )}
          </div>
        )}

        {!selectedProject && projects.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-slate-600 text-lg">
              No projects found. Please create a project first in the Project & Tasks page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
