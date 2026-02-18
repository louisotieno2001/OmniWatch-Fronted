import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MapView, Marker, Polyline } from '../components/MapView';
import Constants from 'expo-constants';
import { getUserSession, clearUserSession } from './services/auth.storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

// Guard profile data interface
interface GuardProfile {
  name: string;
  id: string;
  operatingHours: {
    start: string;
    end: string;
  };
  assignmentLocation: string;
  assignmentLocationId: string;
  assignedAreas: string[];
}

// Assignment interface from backend
interface Assignment {
  id: string;
  date_created: string;
  date_updated: string;
  location: string;
  assigned_areas: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

interface LocationData {
  id: string;
  name: string;
  assigned_areas: string; // The raw comma-separated string from the backend
}
// User data from session
interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  invite_code: string;
  assignments?: Assignment[];
}

// Patrol data from API
interface PatrolData {
  id: string;
  start_time: string;
  end_time?: string;
  user_id: string;
  organization_id?: string;
  location_data?: string;
  status: 'active' | 'completed';
  date_created: string;
  date_updated: string;
}

// Time slots for operating hours
const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export default function GuardDashboard() {
const router = useRouter();
const [activeTab, setActiveTab] = useState<'patrol' | 'details' | 'settings'>('patrol');

  // State for locations and available areas
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Patrol Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [checkpointModalVisible, setCheckpointModalVisible] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState('');

  // Patrol History State
  const [patrolHistory, setPatrolHistory] = useState<PatrolData[]>([]);
  const [isLoadingPatrols, setIsLoadingPatrols] = useState(false);

  // Persistent Patrol State
  const [patrolId, setPatrolId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [locationData, setLocationData] = useState<Array<{latitude: number, longitude: number, timestamp: number}>>([]);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  // Guard Profile State - initialize with empty values
  const [guardProfile, setGuardProfile] = useState<GuardProfile>({
    name: '',
    id: '',
    operatingHours: {
      start: '18:00',
      end: '06:00',
    },
    assignmentLocation: 'Not assigned',
    assignmentLocationId: '',
    assignedAreas: [],
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<GuardProfile>(guardProfile);
  
  // Modals
  const [startTimeModalVisible, setStartTimeModalVisible] = useState(false);
  const [endTimeModalVisible, setEndTimeModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Load user session and assignments
  const loadUserSession = async () => {
    try {
      setIsLoading(true);
      const { token, userData: storedUserData } = await getUserSession();

      if (!token || !storedUserData) {
        // No session found, redirect to login
        Alert.alert(
          'Session Expired',
          'Please login again to continue.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
        return;
      }

      // Check if user is a guard
      if (storedUserData.role !== 'guard') {
        // Not a guard, redirect based on role
        if (storedUserData.role === 'admin' || storedUserData.role === 'supervisor') {
          router.replace('/admin_dash');
        } else {
          Alert.alert(
            'Access Denied',
            'You do not have permission to access this page.',
            [{ text: 'OK', onPress: () => router.replace('/login') }]
          );
        }
        return;
      }

      setUserData(storedUserData);

      // Initialize guard profile from session data
      const initialProfile: GuardProfile = {
        name: `${storedUserData.first_name} ${storedUserData.last_name}`,
        id: `GND-${storedUserData.id}`,
        operatingHours: {
          start: '18:00',
          end: '06:00',
        },
        assignmentLocation: 'Not assigned',
        assignmentLocationId: '',
        assignedAreas: [],
      };

      // Fetch locations and available areas before processing assignments
      const fetchedLocations = await fetchLocationsAndAreas(token, storedUserData.invite_code);

      // If assignments exist in session, find the one that matches the user_id
      if (storedUserData.assignments && storedUserData.assignments.length > 0) {
        console.log(storedUserData)
        const userAssignment = storedUserData.assignments.find((assignment: { user_id: any; }) => assignment.user_id === storedUserData.id);
        if (userAssignment) {
          const assignedLocation = fetchedLocations.find(loc => loc.id === userAssignment.location);
          if (assignedLocation) {
            initialProfile.assignmentLocation = assignedLocation.name;
            initialProfile.assignmentLocationId = assignedLocation.id;
          }
          if (userAssignment.assigned_areas) {
            initialProfile.assignedAreas = userAssignment.assigned_areas.split(',').map((area: string) => area.trim());
          }
          initialProfile.operatingHours.start = userAssignment.start_time;
          initialProfile.operatingHours.end = userAssignment.end_time;
        } else {
          // If no assignment matches, use the first one as fallback
          const assignment = storedUserData.assignments[0];
          const assignedLocation = fetchedLocations.find(loc => loc.id === assignment.location);
          if (assignedLocation) {
            initialProfile.assignmentLocation = assignedLocation.name;
            initialProfile.assignmentLocationId = assignedLocation.id;
          }
          if (assignment.assigned_areas) {
            initialProfile.assignedAreas = assignment.assigned_areas.split(',').map((area: string) => area.trim());
          }
          initialProfile.operatingHours.start = assignment.start_time;
          initialProfile.operatingHours.end = assignment.end_time;
        }
      } else {
        // Fetch assignments from backend if not in session
        await fetchAssignments(token, initialProfile, fetchedLocations);
      }

      // After initialProfile is set, populate availableAreas based on the initial assignment location
      const initialAssignmentLocation = fetchedLocations.find(loc => loc.id === initialProfile.assignmentLocationId);
      if (initialAssignmentLocation && initialAssignmentLocation.assigned_areas) {
        setAvailableAreas(initialAssignmentLocation.assigned_areas.split(',').map(area => area.trim()));
      }

      setGuardProfile(initialProfile);
      setEditableProfile(initialProfile);

      // Load persistent patrol data after session is loaded
      await loadPersistentPatrolData();
      
      // Fetch patrol history
      await fetchPatrolHistory();
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load user data. Please login again.');
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assignments from backend
  const fetchAssignments = async (token: string, profile: GuardProfile, locations: Array<{id: string, name: string}>) => {
    try {
      const response = await fetch(`${API_URL}/my-assignments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.assignments && data.assignments.length > 0) {
          const assignment = data.assignments[0];
          // Resolve location name from ID
          const assignedLocation = locations.find(loc => loc.id === assignment.location);
          if (assignedLocation) {
            profile.assignmentLocation = assignedLocation.name;
            profile.assignmentLocationId = assignedLocation.id;
          } else {
            profile.assignmentLocation = 'Not assigned';
            profile.assignmentLocationId = assignment.location;
          }
          
          if (assignment.assigned_areas) {
            profile.assignedAreas = assignment.assigned_areas.split(',').map((area: string) => area.trim());
          } else {
            profile.assignedAreas = [];
          }
          
          profile.operatingHours.start = assignment.start_time;
          profile.operatingHours.end = assignment.end_time;
        }
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Fetch locations and available areas from backend
  const fetchLocationsAndAreas = async (token: string, inviteCode: string) => {
    let fetchedLocations: LocationData[] = [];
    try {
      // Fetch locations
      const locationsResponse = await fetch(`${API_URL}/locations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        fetchedLocations = locationsData.locations.map((loc: any) => loc as LocationData);
        setLocations(fetchedLocations);


      } else {
        // If locations can't be fetched, at least try to get areas from assignments
        const assignmentsResponse = await fetch(`${API_URL}/my-assignments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          if (assignmentsData.assignments && assignmentsData.assignments.length > 0) {
            const assignment = assignmentsData.assignments[0];
            if (assignment.assigned_areas) {
              const areas = assignment.assigned_areas.split(',').map((area: string) => area.trim());
              setAvailableAreas(areas);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching locations and areas:', error);
    }
    return fetchedLocations;
  };

  // Load persistent patrol data from AsyncStorage
  const loadPersistentPatrolData = async () => {
    try {
      const patrolData = await AsyncStorage.getItem('ongoingPatrol');
      if (patrolData) {
        const parsed = JSON.parse(patrolData);
        setIsRecording(true);
        setRecordingTime(parsed.recordingTime || 0);
        setPatrolId(parsed.patrolId);
        setStartTime(new Date(parsed.startTime));
        setLocationData(parsed.locationData || []);
        setRecordingStatus('Patrol resumed from previous session');

        // Resume location tracking
        startLocationTracking();
      }
    } catch (error) {
      console.error('Error loading persistent patrol data:', error);
    }
  };

  // Fetch patrol history from API
  const fetchPatrolHistory = async () => {
    try {
      setIsLoadingPatrols(true);
      const { token } = await getUserSession();
      
      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/patrols?limit=10&sort=-start_time`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatrolHistory(data.patrols || []);
      } else {
        console.error('Failed to fetch patrols:', response.status);
      }
    } catch (error) {
      console.error('Error fetching patrol history:', error);
    } finally {
      setIsLoadingPatrols(false);
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for patrol tracking.');
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
          };
          setCurrentLocation({ latitude: newLocation.latitude, longitude: newLocation.longitude });
          setLocationData(prev => [...prev, newLocation]);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Handle logout - show custom modal instead of Alert
  const handleLogout = () => {
    console.log('Logout button pressed - showing custom modal');
    setLogoutModalVisible(true);
  };

  // Perform the actual logout
  const performLogout = async () => {
    console.log('Starting logout process...');
    setLogoutModalVisible(false);
    try {
      // Clear user session
      await clearUserSession();
      console.log('Session cleared successfully');
      
      // Clear persistent patrol data
      await AsyncStorage.removeItem('ongoingPatrol');
      console.log('Patrol data cleared');
      
      // Navigate to login
      router.replace('/login');
      console.log('Navigated to login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Recording timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle patrol recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      Alert.alert(
        'End Patrol',
        `Patrol duration: ${formatTime(recordingTime)}\nRecorded checkpoints will be submitted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Patrol',
            style: 'destructive',
            onPress: async () => {
              try {
                // Stop location tracking
                stopLocationTracking();

                // Update patrol record in Directus
                if (patrolId) {
                  const { token } = await getUserSession();
                  const endTime = new Date().toISOString();

                  await fetch(`${API_URL}/patrols/${patrolId}`, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      end_time: endTime,
                      location_data: JSON.stringify(locationData),
                    }),
                  });

                  // Clear persistent patrol data
                  await AsyncStorage.removeItem('ongoingPatrol');
                }

                setIsRecording(false);
                setPatrolId(null);
                setStartTime(null);
                setLocationData([]);
                setCurrentLocation(null);
                setRecordingStatus('Patrol completed successfully');
                setRecordingTime(0);
                
                // Refresh patrol history
                await fetchPatrolHistory();
                
                setTimeout(() => setRecordingStatus(''), 3000);
              } catch (error) {
                console.error('Error ending patrol:', error);
                Alert.alert('Error', 'Failed to save patrol data. Please try again.');
              }
            }
          }
        ]
      );
    } else {
      // Start recording
      try {
        const { token, userData: storedUserData } = await getUserSession();
        if (!token || !storedUserData) {
          Alert.alert('Error', 'Session not found. Please login again.');
          return;
        }

        const orgId = storedUserData.assignments?.[0]?.location_id?.id || 'default';
        const now = new Date().toISOString();

        // Create patrol record in Directus
        const response = await fetch(`${API_URL}/patrols`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            start_time: now,
            user_id: storedUserData.id,
            organization_id: orgId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const newPatrolId = data.data?.id || data.id;
          setPatrolId(newPatrolId);
          setStartTime(new Date(now));

          // Persist patrol data to AsyncStorage
          await AsyncStorage.setItem('ongoingPatrol', JSON.stringify({
            patrolId: newPatrolId,
            startTime: now,
            recordingTime: 0,
            locationData: [],
          }));
        }

        setIsRecording(true);
        setRecordingTime(0);
        setRecordingStatus('Patrol recording started');
        setTimeout(() => setRecordingStatus(''), 3000);

        // Start location tracking
        startLocationTracking();
      } catch (error) {
        console.error('Error starting patrol:', error);
        Alert.alert('Error', 'Failed to start patrol. Please try again.');
      }
    }
  };

  // Handle checkpoint logging
  const logCheckpoint = (area: string) => {
    setCurrentCheckpoint(area);
    setCheckpointModalVisible(true);
  };

  const submitCheckpoint = (note: string) => {
    Alert.alert('Checkpoint Logged', `Area: ${currentCheckpoint}\nNote: ${note || 'None'}`);
    setCheckpointModalVisible(false);
    setCurrentCheckpoint('');
  };

  // Handle area toggle
  const toggleArea = (area: string) => {
    const newAreas = editableProfile.assignedAreas.includes(area)
      ? editableProfile.assignedAreas.filter((a) => a !== area)
      : [...editableProfile.assignedAreas, area];
    setEditableProfile({ ...editableProfile, assignedAreas: newAreas });
  };

  // Handle time selection
  const selectTime = (time: string, type: 'start' | 'end') => {
    setEditableProfile({
      ...editableProfile,
      operatingHours: { ...editableProfile.operatingHours, [type]: time },
    });
    setStartTimeModalVisible(false);
    setEndTimeModalVisible(false);
  };

  // Handle location selection
  const selectLocation = (location: LocationData) => {
    const newAvailableAreas = location.assigned_areas ?
      location.assigned_areas.split(',').map(area => area.trim()) :
      [];

    setAvailableAreas(newAvailableAreas); // Update available areas for selection

    // Also reset assigned areas to be empty, as per user's implicit request "not selected"
    setEditableProfile({
      ...editableProfile,
      assignmentLocation: location.name,
      assignmentLocationId: location.id,
      assignedAreas: [], // When location changes, clear current assigned areas for new selection
    });
    setLocationModalVisible(false);
  };

  // Save profile changes
  const saveProfile = async () => {
    try {
      const { token } = await getUserSession();
      if (!token) {
        Alert.alert('Error', 'Session not found. Please login again.');
        return;
      }

      const updateData = {
        location: editableProfile.assignmentLocationId,
        assigned_areas: editableProfile.assignedAreas.join(','),
        start_time: editableProfile.operatingHours.start,
        end_time: editableProfile.operatingHours.end,
      };

      const response = await fetch(`${API_URL}/my-assignments`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setGuardProfile(editableProfile);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  // Render Patrol Tab
  const renderPatrolTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Recording Status Card */}
      <View style={styles.card}>
        <View style={styles.recordingStatusContainer}>
          <View style={[styles.recordingIndicator, isRecording && styles.recordingActive]} />
          <Text style={styles.recordingStatusText}>
            {isRecording ? 'Recording in Progress' : 'Ready for Patrol'}
          </Text>
        </View>
        
        {isRecording && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          </View>
        )}
        
        {recordingStatus !== '' && (
          <View style={styles.statusMessage}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={styles.statusMessageText}>{recordingStatus}</Text>
          </View>
        )}

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: currentLocation?.latitude || -26.2041, // Default to Johannesburg
              longitude: currentLocation?.longitude || 28.0473,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={currentLocation ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : undefined}
          >
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Current Location"
                description="Your current position"
              />
            )}
            {locationData.length > 1 && (
              <Polyline
                coordinates={locationData.map(loc => ({
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                }))}
                strokeColor="#2563eb"
                strokeWidth={3}
              />
            )}
          </MapView>
        </View>

        <TouchableOpacity
          style={[styles.mainButton, isRecording && styles.stopButton]}
          onPress={toggleRecording}
        >
          <Ionicons
            name={isRecording ? 'stop-circle' : 'play-circle'}
            size={48}
            color="#fff"
          />
          <Text style={styles.mainButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Patrol'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Checkpoints */}
      <Text style={styles.sectionTitle}>Quick Checkpoints</Text>
      <View style={styles.checkpointGrid}>
        {guardProfile.assignedAreas.map((area) => (
          <TouchableOpacity
            key={area}
            style={[styles.checkpointButton, isRecording && styles.checkpointActive]}
            onPress={() => isRecording && logCheckpoint(area)}
            disabled={!isRecording}
          >
            <Ionicons 
              name={isRecording ? 'location' : 'location-outline'} 
              size={24} 
              color={isRecording ? '#fff' : '#64748b'} 
            />
            <Text style={[styles.checkpointText, !isRecording && styles.checkpointTextDisabled]}>
              {area}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Patrol History */}
      <Text style={styles.sectionTitle}>Recent Patrols</Text>
      {isLoadingPatrols ? (
        <View style={styles.historyLoadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.historyLoadingText}>Loading patrols...</Text>
        </View>
      ) : patrolHistory.length > 0 ? (
        <View style={styles.historyContainer}>
          {patrolHistory.map((patrol) => {
            // Calculate duration if both start and end times exist
            let duration = 'N/A';
            if (patrol.start_time && patrol.end_time) {
              const start = new Date(patrol.start_time);
              const end = new Date(patrol.end_time);
              const diffMs = end.getTime() - start.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const hrs = Math.floor(diffMins / 60);
              const mins = diffMins % 60;
              duration = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            } else if (patrol.start_time && patrol.status === 'active') {
              duration = 'In Progress';
            }

            // Format the date
            const patrolDate = patrol.start_time 
              ? new Date(patrol.start_time).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown';

            return (
              <View key={patrol.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons name="walk" size={20} color="#2563eb" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    Patrol #{patrol.id.slice(-4).toUpperCase()}
                  </Text>
                  <Text style={styles.historySubtitle}>
                    {patrolDate}
                  </Text>
                </View>
                <View style={styles.historyDuration}>
                  <Text style={styles.historyDurationText}>{duration}</Text>
                  <Text style={styles.historyLabel}>
                    {patrol.status === 'active' ? 'Active' : 'Duration'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.historyEmptyContainer}>
          <Ionicons name="shield-checkmark" size={40} color="#64748b" />
          <Text style={styles.historyEmptyText}>No patrols recorded yet</Text>
          <Text style={styles.historyEmptySubtext}>Start your first patrol to see history</Text>
        </View>
      )}
    </ScrollView>
  );

  // Render Personal Details Tab
  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Guard Info Card */}
      <View style={styles.card}>
        <View style={styles.guardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {guardProfile.name.split(' ').map((n) => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.guardInfo}>
            <Text style={styles.guardName}>{guardProfile.name}</Text>
            <Text style={styles.guardId}>ID: {guardProfile.id}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditableProfile(guardProfile);
              setIsEditing(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Operating Hours */}
      <Text style={styles.sectionTitle}>Operating Hours</Text>
      <View style={styles.card}>
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Start Time</Text>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => isEditing && setStartTimeModalVisible(true)}
              disabled={!isEditing}
            >
              <Ionicons name="time" size={20} color="#2563eb" />
              <Text style={styles.timeValue}>{editableProfile.operatingHours.start}</Text>
              {isEditing && <Ionicons name="chevron-down" size={16} color="#64748b" />}
            </TouchableOpacity>
          </View>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>End Time</Text>
            <TouchableOpacity 
              style={styles.timeButton}
              onPress={() => isEditing && setEndTimeModalVisible(true)}
              disabled={!isEditing}
            >
              <Ionicons name="moon" size={20} color="#2563eb" />
              <Text style={styles.timeValue}>{editableProfile.operatingHours.end}</Text>
              {isEditing && <Ionicons name="chevron-down" size={16} color="#64748b" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Assignment Location */}
      <Text style={styles.sectionTitle}>Assignment Location</Text>
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => isEditing && setLocationModalVisible(true)}
          disabled={!isEditing}
        >
          <View style={styles.locationLeft}>
            <Ionicons name="location" size={20} color="#2563eb" />
            <Text style={styles.locationLabel}>
              {editableProfile.assignmentLocation || 'Select Location'}
            </Text>
          </View>
          {isEditing && (
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      {/* Assigned Areas */}
      <Text style={styles.sectionTitle}>Assigned Areas</Text>
      <View style={styles.card}>
        <View style={styles.areasGrid}>
          {availableAreas.map((area: string) => {
            const isSelected = editableProfile.assignedAreas.includes(area);
            return (
              <TouchableOpacity
                key={area}
                style={[
                  styles.areaItem,
                  isSelected && styles.areaItemSelected,
                  !isEditing && !isSelected && styles.areaItemDisabled,
                ]}
                onPress={() => isEditing && toggleArea(area)}
                disabled={!isEditing}
              >
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={[
                  styles.areaText,
                  isSelected && styles.areaTextSelected,
                ]}>
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      {isEditing && (
        <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // Render Settings Tab
  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Account Settings */}
      <Text style={styles.sectionTitle}>Account Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="person" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Profile Information</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Notification Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Guard Settings */}
      <Text style={styles.sectionTitle}>Guard Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="shield" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="location" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Location Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="walk" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Patrol Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <Text style={styles.sectionTitle}>App Settings</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Ionicons name="toggle" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="language" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Language</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text style={styles.settingText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <Text style={styles.sectionTitle}>Support</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="chatbubble" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Contact Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Show loading screen while fetching session data
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Guard Dashboard</Text>
          <Text style={styles.headerSubtitle}>{guardProfile.name}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleLogout}
          style={styles.headerLogoutButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'patrol' ? renderPatrolTab() : 
         activeTab === 'details' ? renderDetailsTab() : 
         renderSettingsTab()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('patrol')}
        >
          <Ionicons 
            name={activeTab === 'patrol' ? 'videocam' : 'videocam-outline'} 
            size={26} 
            color={activeTab === 'patrol' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'patrol' && styles.bottomTabActive]}>
            Patrol
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('details')}
        >
          <Ionicons 
            name={activeTab === 'details' ? 'person' : 'person-outline'} 
            size={26} 
            color={activeTab === 'details' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'details' && styles.bottomTabActive]}>
            Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'} 
            size={26} 
            color={activeTab === 'settings' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'settings' && styles.bottomTabActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Checkpoint Modal */}
      <Modal
        visible={checkpointModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCheckpointModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Checkpoint</Text>
            <Text style={styles.modalSubtitle}>{currentCheckpoint}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Add notes (optional)"
              placeholderTextColor="#64748b"
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setCheckpointModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmit]}
                onPress={() => submitCheckpoint('')}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start Time Picker Modal */}
      <Modal
        visible={startTimeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStartTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.pickerModalContent]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Start Time</Text>
              <TouchableOpacity onPress={() => setStartTimeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.pickerItem,
                    editableProfile.operatingHours.start === time && styles.pickerItemSelected,
                  ]}
                  onPress={() => selectTime(time, 'start')}
                >
                  <Text style={[
                    styles.pickerItemText,
                    editableProfile.operatingHours.start === time && styles.pickerItemTextSelected,
                  ]}>
                    {time}
                  </Text>
                  {editableProfile.operatingHours.start === time && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={endTimeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEndTimeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.pickerModalContent]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select End Time</Text>
              <TouchableOpacity onPress={() => setEndTimeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.pickerItem,
                    editableProfile.operatingHours.end === time && styles.pickerItemSelected,
                  ]}
                  onPress={() => selectTime(time, 'end')}
                >
                  <Text style={[
                    styles.pickerItemText,
                    editableProfile.operatingHours.end === time && styles.pickerItemTextSelected,
                  ]}>
                    {time}
                  </Text>
                  {editableProfile.operatingHours.end === time && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.pickerModalContent]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Assignment Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.pickerItem,
                    editableProfile.assignmentLocationId === location.id && styles.pickerItemSelected,
                  ]}
                  onPress={() => selectLocation(location)}
                >
                  <View style={styles.pickerItemContent}>
                    <Ionicons name="location-outline" size={20} color={editableProfile.assignmentLocationId === location.id ? '#fff' : '#94a3b8'} />
                    <Text style={[
                      styles.pickerItemText,
                      editableProfile.assignmentLocationId === location.id && styles.pickerItemTextSelected,
                    ]}>
                      {location.name}
                    </Text>
                  </View>
                  {editableProfile.assignmentLocationId === location.id && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalSubtitle}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  console.log('Logout cancelled by user');
                  setLogoutModalVisible(false);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmit]}
                onPress={performLogout}
              >
                <Text style={styles.modalSubmitText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  headerLogoutButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  
  // Patrol Tab Styles
  recordingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#64748b',
    marginRight: 8,
  },
  recordingActive: {
    backgroundColor: '#ef4444',
  },
  recordingStatusText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusMessageText: {
    color: '#22c55e',
    fontSize: 14,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 12,
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  checkpointGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  checkpointButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '47%',
  },
  checkpointActive: {
    backgroundColor: '#2563eb',
  },
  checkpointText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  checkpointTextDisabled: {
    color: '#64748b',
  },
  historyContainer: {
    gap: 12,
    marginBottom: 56,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historySubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  historyDuration: {
    alignItems: 'flex-end',
  },
  historyDurationText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  historyLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  historyLoadingText: {
    color: '#64748b',
    fontSize: 14,
  },
  historyEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  historyEmptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  historyEmptySubtext: {
    color: '#64748b',
    fontSize: 14,
  },
  
  // Details Tab Styles
  guardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  guardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  guardName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  guardId: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  editButton: {
    padding: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  timeValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationLabel: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 16,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 42,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  areaItemSelected: {
    backgroundColor: '#2563eb',
  },
  areaItemDisabled: {
    opacity: 0.5,
  },
  areaText: {
    color: '#fff',
    fontSize: 14,
  },
  areaTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 26,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Bottom Tab Bar Styles
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
    paddingBottom: 35,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  bottomTabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  bottomTabActive: {
    color: '#2563eb',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pickerModalContent: {
    width: '85%',
    maxHeight: '60%',
    padding: 0,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerList: {
    maxHeight: 350,
    padding: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#2563eb',
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
  },
  pickerItemTextSelected: {
    fontWeight: '600',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#2563eb',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#1e293b',
  },
  modalSubmit: {
    backgroundColor: '#2563eb',
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 16,
  },

  // Map styles
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  map: {
    flex: 1,
  },
  
  // Settings Tab Styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
