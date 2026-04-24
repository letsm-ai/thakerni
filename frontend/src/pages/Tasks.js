import React, { useState, useEffect } from 'react';
import { tasksApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Check, Trash, Circle, Flag, Calendar as CalendarIcon, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';

const Tasks = () => {
  const { t, isRTL } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: null,
    priority: 'medium'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await tasksApi.getTasks();
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await tasksApi.createTask(newTask);
      setNewTask({ title: '', description: '', due_date: null, priority: 'medium' });
      setShowModal(false);
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await tasksApi.updateTask(task.task_id, { completed: !task.completed });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-slate-400';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="tasks-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('tasks')}</h1>
          <p className="text-slate-500 mt-1">{isRTL ? 'أدر مهامك وكن منتجاً' : 'Manage your tasks and stay productive'}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2.5 font-semibold hover:bg-[#001A7A] transition-colors"
          data-testid="add-task-button"
        >
          <Plus size={20} weight="bold" />
          {t('addTask')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            data-testid={`filter-${f}`}
          >
            {f === 'all' ? t('all') : f === 'pending' ? t('pending') : t('completed')}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Circle size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('noTasks')}</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-[#002FA7] font-semibold hover:underline"
            >
              {t('createFirstTask')}
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.div
                key={task.task_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all"
                data-testid={`task-${task.task_id}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      task.completed
                        ? 'bg-[#002FA7] border-[#002FA7]'
                        : 'border-slate-300 hover:border-[#002FA7]'
                    }`}
                    data-testid={`toggle-task-${task.task_id}`}
                  >
                    {task.completed && <Check size={14} className="text-white" weight="bold" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <CalendarIcon size={14} />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-xs ${getPriorityColor(task.priority)}`}>
                        <Flag size={14} weight="fill" />
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.task_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded transition-all"
                    data-testid={`delete-task-${task.task_id}`}
                  >
                    <Trash size={18} className="text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Task Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 font-heading">
              {t('createNewTask')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('taskTitle')} *
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                placeholder={isRTL ? 'أدخل عنوان المهمة' : 'Enter task title'}
                required
                dir="auto"
                data-testid="task-title-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('description')}
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none resize-none"
                rows={3}
                placeholder={isRTL ? 'أضف وصفاً (اختياري)' : 'Add description (optional)'}
                dir="auto"
                data-testid="task-description-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('dueDate')}
              </label>
              <Calendar
                mode="single"
                selected={newTask.due_date}
                onSelect={(date) => setNewTask({ ...newTask, due_date: date })}
                className="border border-slate-200 rounded-md"
                data-testid="task-due-date"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('priority')}
              </label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewTask({ ...newTask, priority: p })}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      newTask.priority === p
                        ? p === 'high' ? 'bg-red-100 text-red-700 border border-red-200'
                        : p === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        : 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`priority-${p}`}
                  >
                    {p === 'high' ? t('high') : p === 'medium' ? t('medium') : t('low')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-md font-medium hover:bg-slate-50 transition-colors"
                data-testid="cancel-task-button"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#002FA7] text-white rounded-md font-semibold hover:bg-[#001A7A] transition-colors"
                data-testid="save-task-button"
              >
                {t('createTask')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
