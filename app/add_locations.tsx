import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserSession } from './services/auth.storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

export default function AddLocationsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [assignedAreas, setAssignedAreas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Location name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { token } = await getUserSession();

      if (!token) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }

      const response = await fetch(`${API_URL}/admin/locations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          assigned_areas: assignedAreas.trim(),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create location');
      }

      Alert.alert('Success', 'Location added successfully.', [
        {
          text: 'OK',
          onPress: () => router.replace('/locations'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Create Failed', error?.message || 'Failed to create location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add New Location</Text>
        <Text style={styles.subtitle}>Create a location for your organization guards.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Location Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. University Of Nairobi"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Assigned Areas</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="e.g. Gate A, Parking Zone 1, Lobby"
            placeholderTextColor="#64748b"
            value={assignedAreas}
            onChangeText={setAssignedAreas}
            multiline
          />
          <Text style={styles.hint}>Use commas to separate multiple areas.</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Add Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#cbd5e1',
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
