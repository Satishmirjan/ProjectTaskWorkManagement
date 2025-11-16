import { useState } from 'react';
import ProjectTasksPage from './components/ProjectTasksPage';
import DailyWorkPage from './components/DailyWorkPage';
import ViewWorkPage from './components/ViewWorkPage';
import { Folder, Calendar, BarChart3 } from 'lucide-react';

type Page = 'projects' | 'daily' | 'view';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('projects');

  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Folder className="text-blue-600" size={28} />
              <h1 className="text-xl font-bold text-slate-800">Project Tracker</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage('projects')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'projects'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Folder size={18} />
                Projects & Tasks
              </button>
              <button
                onClick={() => setCurrentPage('daily')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Calendar size={18} />
                Daily Work Entry
              </button>
              <button
                onClick={() => setCurrentPage('view')}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  currentPage === 'view'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BarChart3 size={18} />
                View Work
              </button>
            </div>
          </div>
        </div>
      </nav>

      {currentPage === 'projects' && <ProjectTasksPage />}
      {currentPage === 'daily' && <DailyWorkPage />}
      {currentPage === 'view' && <ViewWorkPage />}
    </div>
  );
}

export default App;
