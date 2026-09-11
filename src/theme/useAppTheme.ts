import { useAppStore } from '../store/useAppStore';
import { colors } from './colors';

export function useAppTheme() {
  const theme = useAppStore(state => state.theme);
  return colors[theme];
}
