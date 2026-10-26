import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { isAllowedQaApiUrl, QA_API_URL_ERROR } from './qaEnvironment';

const API_URL_KEY = 'api_url';
const isQaBuild =
  Constants.expoConfig?.extra?.appEnvironment === 'qa' || process.env.EXPO_PUBLIC_APP_ENV === 'qa';

function validateUrlForBuild(url: string): string {
  const normalizedUrl = url.trim().replace(/\/+$/, '');
  if (isQaBuild && !isAllowedQaApiUrl(normalizedUrl)) {
    throw new Error(QA_API_URL_ERROR);
  }
  return normalizedUrl;
}

export const getApiUrl = async (): Promise<string> => {
  const storedUrl = await AsyncStorage.getItem(API_URL_KEY);
  const apiUrl = storedUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '';
  return isQaBuild ? validateUrlForBuild(apiUrl) : apiUrl;
};

export const setApiUrl = async (url: string): Promise<void> => {
  const trimmedUrl = url.trim(); // Trim whitespace
  const apiUrl = isQaBuild ? validateUrlForBuild(trimmedUrl) : trimmedUrl;
  await AsyncStorage.setItem(API_URL_KEY, apiUrl);
};
