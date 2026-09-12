import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Root: undefined;
  TaskForm: { taskId?: string } | undefined;
  TaskDetail: { taskId: string };
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
export type TaskFormScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskForm'>;
export type TaskDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;
