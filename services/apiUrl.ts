import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = 'api_url';

export const getApiUrl = async (): Promise<string> => {
  const storedUrl = await AsyncStorage.getItem(API_URL_KEY);
  return storedUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
};

export const setApiUrl = async (url: string): Promise<void> => {
  const trimmedUrl = url.trim(); // Trim whitespace
  await AsyncStorage.setItem(API_URL_KEY, trimmedUrl);
};
