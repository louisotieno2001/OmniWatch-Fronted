import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

interface LocationData {
  id: string;
  name: string;
  assigned_areas?: string;
}

export default function NewAssignmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ guardId?: string; guardName?: string }>();
  const guardId = Array.isArray(params.guardId) ? params.guardId[0] : params.guardId || '';
  const guardName = Array.isArray(params.guardName) ? params.guardName[0] : params.guardName || 'Selected Guard';

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [assignedAreas, setAssignedAreas] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId) || null,
    [locations, selectedLocationId]
  );

  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        const { token } = await getUserSession();
        if (!token) {
          Alert.alert('Session Expired', 'Please login again.', [
            { text: 'OK', onPress: () => router.replace('/login') },
          ]);
          return;
        }

        const response = await fetch(`${API_URL}/admin/locations`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Failed to load locations');
        }

        const data = await response.json();
        const fetchedLocations = data.locations || [];
        setLocations(fetchedLocations);

        if (fetchedLocations.length > 0) {
          setSelectedLocationId(fetchedLocations[0].id);
          setAssignedAreas(fetchedLocations[0].assigned_areas || '');
        }
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load locations.');
      } finally {
        setLoadingLocations(false);
      }
    };

    loadLocations();
  }, [router]);

  const selectLocation = (location: LocationData) => {
    setSelectedLocationId(location.id);
    if (!assignedAreas.trim()) {
      setAssignedAreas(location.assigned_areas || '');
    }
  };

  const handleCreateAssignment = async () => {
    if (!guardId) {
      Alert.alert('Missing Guard', 'No guard selected for this assignment.');
      return;
    }
    if (!selectedLocationId) {
      Alert.alert('Validation Error', 'Please select a location.');
      return;
    }
    if (!assignedAreas.trim()) {
      Alert.alert('Validation Error', 'Assigned areas are required.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation Error', 'Start and end time are required.');
      return;
    }

    try {
      setSubmitting(true);
      const { token } = await getUserSession();
      if (!token) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }

      const response = await fetch(`${API_URL}/admin/assignments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: guardId,
          location: selectedLocationId,
          assigned_areas: assignedAreas.trim(),
          start_time: startTime.trim(),
          end_time: endTime.trim(),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to create assignment');
      }

      Alert.alert('Success', 'Assignment created successfully.', [
        { text: 'OK', onPress: () => router.replace('/manage_guards') },
      ]);
    } catch (error: any) {
      Alert.alert('Assignment Failed', error?.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>New Assignment</Text>
        <Text style={styles.subtitle}>Assign a location to a guard</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Guard</Text>
          <Text style={styles.value}>{guardName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Location</Text>
        {loadingLocations ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No locations found. Add a location first.</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/add_locations')}>
              <Text style={styles.secondaryBtnText}>Add Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.locationList}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationItem,
                  selectedLocationId === location.id && styles.locationItemSelected,
                ]}
                onPress={() => selectLocation(location)}
              >
                <Text
                  style={[
                    styles.locationName,
                    selectedLocationId === location.id && styles.locationNameSelected,
                  ]}
                >
                  {location.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Assigned Areas</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={assignedAreas}
            onChangeText={setAssignedAreas}
            placeholder={selectedLocation?.assigned_areas || 'Comma-separated areas'}
            placeholderTextColor="#64748b"
            multiline
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={submitting}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.disabled]}
            onPress={handleCreateAssignment}
            disabled={submitting || loadingLocations || locations.length === 0}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create Assignment</Text>
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
    paddingBottom: 26,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 12,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderWrap: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 26,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#cbd5e1',
    marginBottom: 10,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  locationList: {
    marginBottom: 12,
  },
  locationItem: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  locationItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#1d4ed820',
  },
  locationName: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  locationNameSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeField: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#334155',
    paddingVertical: 12,
  },
  submitBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
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
  disabled: {
    opacity: 0.7,
  },
});
