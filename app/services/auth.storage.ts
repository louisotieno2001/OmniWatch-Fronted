import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';

export const saveUserSession = async (token: string, userData: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log('User session saved successfully.');
  } catch (error) {
    console.error('Failed to save user session:', error);
    throw error;
  }
};

export const getUserSession = async (): Promise<{ token: string | null; userData: any | null }> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userDataJson = await AsyncStorage.getItem(USER_DATA_KEY);
    const userData = userDataJson ? JSON.parse(userDataJson) : null;
    console.log('User session retrieved:', { token, userData });
    return { token, userData };
  } catch (error) {
    console.error('Failed to retrieve user session:', error);
    return { token: null, userData: null };
  }
};

export const clearUserSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    console.log('User session cleared.');
  } catch (error) {
    console.error('Failed to clear user session:', error);
    throw error;
  }
};