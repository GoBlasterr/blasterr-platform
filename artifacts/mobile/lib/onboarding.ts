import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITED_KEY = 'blasterr:has-visited:v1';

export async function hasVisitedApp(): Promise<boolean> {
  return (await AsyncStorage.getItem(VISITED_KEY)) === 'true';
}

export async function markAppVisited(): Promise<void> {
  await AsyncStorage.setItem(VISITED_KEY, 'true');
}
