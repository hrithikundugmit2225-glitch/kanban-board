export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  position: number;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  is_starred: boolean;
}
