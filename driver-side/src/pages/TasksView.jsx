import React from 'react';
import TasksPanel from '../components/TasksPanel';

// The full task list for the shift (moved off the dashboard).
export default function TasksView({ tasks, task }) {
  return (
    <div className="max-w-3xl mx-auto h-full min-h-[420px]">
      <TasksPanel tasks={tasks} progressPct={task?.progressPct ?? 0} elapsedMin={task?.elapsedMin ?? 0} />
    </div>
  );
}
