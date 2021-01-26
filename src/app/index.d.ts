import { stepEnum } from './enum';

export interface TaskTree {
  id: string;
  runCound: number;
  states: Array<stepEnum>;
  fileline: string;
  filteredStack: Array<string>;
  timeTravelId: number;
  children: Array<TaskTree>;
}

export interface TimeTravelData {
  id: number;
  state: stepEnum;
  node?: TaskTree;
}
