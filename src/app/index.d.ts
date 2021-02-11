import { StateEnum } from './enum';
import { TaskNode as StoreTaskNode } from './StoreTaskZoneSpec';

export interface TaskNode extends StoreTaskNode {
  id: string;
  runCount: number;
  timeTravel: TimeTravel[];
  fileline?: string;
  children: TaskNode[];
}

export interface TimeTravel {
  state: StateEnum;
  task?: any;
  stack?: string[];
  runCount?: number;
  node?: TaskNode;
}
