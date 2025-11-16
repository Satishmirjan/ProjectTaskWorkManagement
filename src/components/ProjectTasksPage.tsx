import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Project, Task, Milestone } from '../types';
import { Plus, Save, Trash2, CheckSquare } from 'lucide-react';

export default function ProjectTasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneTasks, setMilestoneTasks] = useState<Map<string, string[]>>(new Map()); // milestone_id -> task_ids[]

  const [projectForm, setProjectForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
  });

  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject.id);
      loadMilestones(selectedProject.id);
      loadMilestoneTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
    } else if (data) {
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    }
  };

  const loadTasks = async (projectId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
    } else if (data) {
      setTasks(data);
    }
  };

  const loadMilestones = async (projectId: string) => {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading milestones:', error);
    } else if (data) {
      // Deduplicate milestones by id (in case of duplicate loads)
      const uniqueMilestones = Array.from(
        new Map(data.map(m => [m.id, m])).values()
      );
      setMilestones(uniqueMilestones);
    }
  };

  const loadMilestoneTasks = async (projectId: string) => {
    // Get all tasks for this project
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', projectId);

    if (!taskData || taskData.length === 0) {
      setMilestoneTasks(new Map());
      return;
    }

    const taskIds = taskData.map(t => t.id);

    // Get all milestone-task relationships for these tasks
    const { data, error } = await supabase
      .from('milestone_tasks')
      .select('milestone_id, task_id')
      .in('task_id', taskIds);

    if (error) {
      console.error('Error loading milestone tasks:', error);
      return;
    }

    // Build map: milestone_id -> task_ids[]
    const map = new Map<string, string[]>();
    if (data) {
      data.forEach((mt: { milestone_id: string; task_id: string }) => {
        if (!map.has(mt.milestone_id)) {
          map.set(mt.milestone_id, []);
        }
        map.get(mt.milestone_id)!.push(mt.task_id);
      });
    }
    setMilestoneTasks(map);
  };

  const createProject = async () => {
    if (!projectForm.name || !projectForm.start_date || !projectForm.end_date) {
      alert('Please fill in all project fields');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([projectForm])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    } else if (data) {
      setProjects([data, ...projects]);
      setSelectedProject(data);
      setProjectForm({ name: '', start_date: '', end_date: '' });
    }
  };

  const addTask = async () => {
    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    const newTask = {
      project_id: selectedProject.id,
      name: `Task ${tasks.length + 1}`,
      planned_start_date: null,
      planned_end_date: null,
      actual_start_date: null,
      actual_end_date: null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
    } else if (data) {
      setTasks([...tasks, data]);
      // Reload milestone tasks to ensure consistency
      if (selectedProject) {
        loadMilestoneTasks(selectedProject.id);
      }
    }
  };

  // Calculate milestone dates from its tasks (uses current tasks state)
  const calculateMilestoneDates = (milestoneId: string): { planned_start: string | null; planned_end: string | null; actual_start: string | null; actual_end: string | null } => {
    return calculateMilestoneDatesWithTasks(milestoneId, tasks);
  };

  // Compute status based on dates
  const computeStatus = (plannedStart: string | null, plannedEnd: string | null, actualStart: string | null, actualEnd: string | null): string => {
    if (actualEnd) {
      return 'Completed';
    }
    if (actualStart) {
      return 'In Progress';
    }
    if (plannedStart && new Date(plannedStart) <= new Date()) {
      return 'Started';
    }
    return 'Not Started';
  };

  // Helper to calculate milestone dates with a specific task list
  const calculateMilestoneDatesWithTasks = (milestoneId: string, taskList: Task[]): { planned_start: string | null; planned_end: string | null; actual_start: string | null; actual_end: string | null } => {
    const taskIds = milestoneTasks.get(milestoneId) || [];
    const milestoneTaskList = taskList.filter(t => taskIds.includes(t.id));

    if (milestoneTaskList.length === 0) {
      return { planned_start: null, planned_end: null, actual_start: null, actual_end: null };
    }

    // Planned start = earliest planned_start_date
    const plannedStarts = milestoneTaskList
      .map(t => t.planned_start_date)
      .filter((date): date is string => date !== null);
    const planned_start = plannedStarts.length > 0 
      ? plannedStarts.reduce((earliest, current) => current < earliest ? current : earliest)
      : null;

    // Planned end = latest planned_end_date
    const plannedEnds = milestoneTaskList
      .map(t => t.planned_end_date)
      .filter((date): date is string => date !== null);
    const planned_end = plannedEnds.length > 0
      ? plannedEnds.reduce((latest, current) => current > latest ? current : latest)
      : null;

    // Actual start = earliest actual_start_date
    const actualStarts = milestoneTaskList
      .map(t => t.actual_start_date)
      .filter((date): date is string => date !== null);
    const actual_start = actualStarts.length > 0
      ? actualStarts.reduce((earliest, current) => current < earliest ? current : earliest)
      : null;

    // Actual end = latest actual_end_date
    const actualEnds = milestoneTaskList
      .map(t => t.actual_end_date)
      .filter((date): date is string => date !== null);
    const actual_end = actualEnds.length > 0
      ? actualEnds.reduce((latest, current) => current > latest ? current : latest)
      : null;

    return { planned_start, planned_end, actual_start, actual_end };
  };

  const updateTask = async (taskId: string, field: string, value: string) => {
    // Use functional update to ensure we always have the latest state (prevents race conditions)
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(t => t.id === taskId ? { ...t, [field]: value || null } : t);
      
      // Update database asynchronously (fire and forget for better UX)
      supabase
        .from('tasks')
        .update({ [field]: value || null })
        .eq('id', taskId)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating task:', error);
            // Reload tasks on error to sync with database
            if (selectedProject) {
              loadTasks(selectedProject.id);
            }
          } else {
            // Update milestone dates if this task belongs to a milestone
            const milestoneId = Array.from(milestoneTasks.entries()).find(([_, taskIds]) => taskIds.includes(taskId))?.[0];
            if (milestoneId) {
              // Use current state to calculate dates
              setTasks(currentTasks => {
                const dates = calculateMilestoneDatesWithTasks(milestoneId, currentTasks);
                
                // Update milestone in database
                supabase
                  .from('milestones')
                  .update({
                    planned_start_date: dates.planned_start,
                    planned_end_date: dates.planned_end,
                    actual_start_date: dates.actual_start,
                    actual_end_date: dates.actual_end,
                  })
                  .eq('id', milestoneId)
                  .then(() => {
                    // Refresh milestones
                    if (selectedProject) {
                      loadMilestones(selectedProject.id);
                    }
                  });
                
                return currentTasks; // Don't modify state here
              });
            }
          }
        });
      
      return updatedTasks;
    });
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
    } else {
      setTasks(tasks.filter(t => t.id !== taskId));
      selectedTasks.delete(taskId);
      setSelectedTasks(new Set(selectedTasks));
      // Reload milestone tasks to ensure consistency
      if (selectedProject) {
        loadMilestoneTasks(selectedProject.id);
        loadMilestones(selectedProject.id);
      }
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? The tasks will remain but will be unassigned.')) {
      return;
    }

    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) {
      console.error('Error deleting milestone:', error);
      alert('Error deleting milestone');
    } else {
      // Reload milestones and milestone tasks
      if (selectedProject) {
        await loadMilestones(selectedProject.id);
        await loadMilestoneTasks(selectedProject.id);
      }
    }
  };

  const createMilestone = async () => {
    if (!selectedProject || !milestoneForm.name) {
      alert('Please enter a milestone name');
      return;
    }

    if (selectedTasks.size === 0) {
      alert('Please select at least one task for the milestone');
      return;
    }

    // Calculate dates from selected tasks
    const selectedTaskList = tasks.filter(t => selectedTasks.has(t.id));
    const plannedStarts = selectedTaskList
      .map(t => t.planned_start_date)
      .filter((date): date is string => date !== null);
    const plannedEnds = selectedTaskList
      .map(t => t.planned_end_date)
      .filter((date): date is string => date !== null);
    const actualStarts = selectedTaskList
      .map(t => t.actual_start_date)
      .filter((date): date is string => date !== null);
    const actualEnds = selectedTaskList
      .map(t => t.actual_end_date)
      .filter((date): date is string => date !== null);

    const planned_start_date = plannedStarts.length > 0 
      ? plannedStarts.reduce((earliest, current) => current < earliest ? current : earliest)
      : null;
    const planned_end_date = plannedEnds.length > 0
      ? plannedEnds.reduce((latest, current) => current > latest ? current : latest)
      : null;
    const actual_start_date = actualStarts.length > 0
      ? actualStarts.reduce((earliest, current) => current < earliest ? current : earliest)
      : null;
    const actual_end_date = actualEnds.length > 0
      ? actualEnds.reduce((latest, current) => current > latest ? current : latest)
      : null;

    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .insert([{
        project_id: selectedProject.id,
        name: milestoneForm.name,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
      }])
      .select()
      .single();

    if (milestoneError) {
      console.error('Error creating milestone:', milestoneError);
      return;
    }

    const milestoneTaskRelations = Array.from(selectedTasks).map(taskId => ({
      milestone_id: milestone.id,
      task_id: taskId,
    }));

    const { error: linkError } = await supabase
      .from('milestone_tasks')
      .insert(milestoneTaskRelations);

    if (linkError) {
      console.error('Error linking tasks to milestone:', linkError);
    } else {
      // Reload milestone tasks to ensure consistency
      if (selectedProject) {
        await loadMilestoneTasks(selectedProject.id);
        await loadMilestones(selectedProject.id);
      }
      setShowMilestoneModal(false);
      setMilestoneForm({
        name: '',
        planned_start_date: '',
        planned_end_date: '',
        actual_start_date: '',
        actual_end_date: '',
      });
      setSelectedTasks(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Project & Tasks</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-slate-700 mb-4">Create Project</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Project Name"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            />
            <input
              type="date"
              placeholder="Start Date"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectForm.start_date}
              onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
            />
            <input
              type="date"
              placeholder="End Date"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={projectForm.end_date}
              onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
            />
            <button
              onClick={createProject}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Create Project
            </button>
          </div>
        </div>

        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-700">Select Project</h2>
              <select
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project || null);
                }}
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {selectedProject && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-slate-700">Task List</h2>
              <div className="flex gap-2">
                <button
                  onClick={addTask}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Task
                </button>
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  disabled={selectedTasks.size === 0}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <CheckSquare size={18} />
                  Create Milestone ({selectedTasks.size})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Select</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Name</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Planned Start</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Planned End</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Actual Start</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Actual End</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Status</th>
                    <th className="py-3 px-4 text-left text-slate-600 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Get all task IDs that belong to milestones
                    const taskIdsInMilestones = new Set<string>();
                    milestoneTasks.forEach((taskIds) => {
                      taskIds.forEach((taskId) => taskIdsInMilestones.add(taskId));
                    });

                    // Get unassigned tasks
                    const unassignedTasks = tasks.filter((t) => !taskIdsInMilestones.has(t.id));

                    // Build rows: milestone rows + their tasks
                    const rows: JSX.Element[] = [];
                    
                    // Deduplicate milestones by id before rendering (safety check)
                    const uniqueMilestonesMap = new Map<string, Milestone>();
                    milestones.forEach(m => uniqueMilestonesMap.set(m.id, m));
                    const uniqueMilestones = Array.from(uniqueMilestonesMap.values());

                    // Add milestone rows with their tasks
                    uniqueMilestones.forEach((milestone) => {
                      const milestoneTaskIds = milestoneTasks.get(milestone.id) || [];
                      const milestoneTaskList = tasks.filter((t) => milestoneTaskIds.includes(t.id));
                      
                      // Calculate milestone dates from tasks
                      const milestoneDates = calculateMilestoneDates(milestone.id);
                      const milestoneStatus = computeStatus(
                        milestoneDates.planned_start,
                        milestoneDates.planned_end,
                        milestoneDates.actual_start,
                        milestoneDates.actual_end
                      );

                      // Add milestone row
                      rows.push(
                        <tr key={milestone.id} className="bg-purple-50 border-b-2 border-purple-200">
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 font-semibold text-purple-700">{milestone.name}</td>
                          <td className="py-3 px-4 text-purple-600">{milestoneDates.planned_start || '-'}</td>
                          <td className="py-3 px-4 text-purple-600">{milestoneDates.planned_end || '-'}</td>
                          <td className="py-3 px-4 text-purple-600">{milestoneDates.actual_start || '-'}</td>
                          <td className="py-3 px-4 text-purple-600">{milestoneDates.actual_end || '-'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                              {milestoneStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => deleteMilestone(milestone.id)}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Delete Milestone"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );

                      // Add tasks under this milestone
                      milestoneTaskList.forEach((task) => {
                        const taskStatus = computeStatus(
                          task.planned_start_date,
                          task.planned_end_date,
                          task.actual_start_date,
                          task.actual_end_date
                        );
                        rows.push(
                          <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedTasks.has(task.id)}
                                onChange={() => toggleTaskSelection(task.id)}
                                className="w-5 h-5 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 pl-8">
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={task.planned_start_date || ''}
                                onChange={(e) => updateTask(task.id, 'planned_start_date', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={task.planned_end_date || ''}
                                onChange={(e) => updateTask(task.id, 'planned_end_date', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={task.actual_start_date || ''}
                                onChange={(e) => updateTask(task.id, 'actual_start_date', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="date"
                                value={task.actual_end_date || ''}
                                onChange={(e) => updateTask(task.id, 'actual_end_date', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {taskStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-red-600 hover:text-red-800 transition"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    });

                    // Add unassigned tasks section header if there are any
                    if (unassignedTasks.length > 0) {
                      rows.push(
                        <tr key="unassigned-header" className="bg-slate-100 border-b-2 border-slate-300">
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 font-semibold text-slate-700" colSpan={6}>Unassigned Tasks</td>
                          <td className="py-3 px-4"></td>
                        </tr>
                      );

                      // Add unassigned tasks
                      unassignedTasks.forEach((task) => {
                        const taskStatus = computeStatus(
                          task.planned_start_date,
                          task.planned_end_date,
                          task.actual_start_date,
                          task.actual_end_date
                        );
                        rows.push(
                    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={task.name}
                          onChange={(e) => updateTask(task.id, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={task.planned_start_date || ''}
                          onChange={(e) => updateTask(task.id, 'planned_start_date', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={task.planned_end_date || ''}
                          onChange={(e) => updateTask(task.id, 'planned_end_date', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={task.actual_start_date || ''}
                          onChange={(e) => updateTask(task.id, 'actual_start_date', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={task.actual_end_date || ''}
                          onChange={(e) => updateTask(task.id, 'actual_end_date', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {taskStatus}
                              </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                        );
                      });
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-semibold text-slate-700 mb-6">Create Milestone</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Milestone Name</label>
                <input
                  type="text"
                  placeholder="Enter milestone name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={milestoneForm.name}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Selected Tasks: {selectedTasks.size}
                </p>
                <p className="text-xs text-blue-700">
                  Milestone dates will be automatically calculated from the selected tasks:
                  <br />• Planned Start = Earliest task planned start date
                  <br />• Planned End = Latest task planned end date
                  <br />• Actual Start = Earliest task actual start date
                  <br />• Actual End = Latest task actual end date
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={createMilestone}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
              >
                Create Milestone
              </button>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="flex-1 bg-slate-300 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
