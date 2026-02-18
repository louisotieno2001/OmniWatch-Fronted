import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
} from 'react-native';

// Interfaces
interface Guard {
  id: string;
  name: string;
  location: string;
  locationId: string;
  status: 'active' | 'inactive' | 'on-break';
  lastSeen: string;
  assignedAreas: string[];
  operatingHours: {
    start: string;
    end: string;
  };
  phone: string;
  email: string;
  joinDate: string;
}

interface Patrol {
  id: string;
  guardId: string;
  guardName: string;
  location: string;
  startTime: string;
  endTime: string;
  duration: string;
  checkpoints: string[];
  status: 'completed' | 'in-progress' | 'missed';
  notes?: string;
}

interface Alert {
  id: string;
  type: 'emergency' | 'warning' | 'info' | 'maintenance';
  title: string;
  message: string;
  guardId?: string;
  guardName?: string;
  location: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
}

interface AdminProfile {
  name: string;
  id: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  joinDate: string;
  managedGuards: number;
  totalLocations: number;
}

// Dummy data
const DUMMY_GUARDS: Guard[] = [
  {
    id: 'GND-2024-001',
    name: 'John Smith',
    location: 'OmniWatch Headquarters',
    locationId: 'loc_1',
    status: 'active',
    lastSeen: '2 minutes ago',
    assignedAreas: ['Front Gate', 'Garden'],
    operatingHours: { start: '18:00', end: '06:00' },
    phone: '+1-555-0101',
    email: 'john.smith@omniwatch.com',
    joinDate: '2023-01-15',
  },
  {
    id: 'GND-2024-002',
    name: 'Sarah Johnson',
    location: 'Eastgate Shopping Mall',
    locationId: 'loc_2',
    status: 'active',
    lastSeen: '5 minutes ago',
    assignedAreas: ['Parking Lot', 'Main Building'],
    operatingHours: { start: '20:00', end: '08:00' },
    phone: '+1-555-0102',
    email: 'sarah.johnson@omniwatch.com',
    joinDate: '2023-03-20',
  },
  {
    id: 'GND-2024-003',
    name: 'Mike Davis',
    location: 'Westside Industrial Park',
    locationId: 'loc_3',
    status: 'on-break',
    lastSeen: '15 minutes ago',
    assignedAreas: ['Perimeter', 'Warehouse'],
    operatingHours: { start: '22:00', end: '10:00' },
    phone: '+1-555-0103',
    email: 'mike.davis@omniwatch.com',
    joinDate: '2023-05-10',
  },
  {
    id: 'GND-2024-004',
    name: 'Lisa Chen',
    location: 'Northgate Residential Complex',
    locationId: 'loc_4',
    status: 'inactive',
    lastSeen: '2 hours ago',
    assignedAreas: ['Lobby', 'CCTV Room'],
    operatingHours: { start: '16:00', end: '04:00' },
    phone: '+1-555-0104',
    email: 'lisa.chen@omniwatch.com',
    joinDate: '2023-07-05',
  },
];

const DUMMY_PATROLS: Patrol[] = [
  {
    id: 'PTL-001',
    guardId: 'GND-2024-001',
    guardName: 'John Smith',
    location: 'OmniWatch Headquarters',
    startTime: '2024-01-17T18:00:00Z',
    endTime: '2024-01-17T19:30:00Z',
    duration: '1:30:00',
    checkpoints: ['Front Gate', 'Garden', 'Parking Lot'],
    status: 'completed',
    notes: 'All areas secure',
  },
  {
    id: 'PTL-002',
    guardId: 'GND-2024-002',
    guardName: 'Sarah Johnson',
    location: 'Eastgate Shopping Mall',
    startTime: '2024-01-17T20:00:00Z',
    endTime: '2024-01-17T20:45:00Z',
    duration: '0:45:00',
    checkpoints: ['Parking Lot', 'Main Building'],
    status: 'in-progress',
  },
  {
    id: 'PTL-003',
    guardId: 'GND-2024-003',
    guardName: 'Mike Davis',
    location: 'Westside Industrial Park',
    startTime: '2024-01-17T14:00:00Z',
    endTime: '2024-01-17T15:45:00Z',
    duration: '1:45:00',
    checkpoints: ['Perimeter', 'Warehouse'],
    status: 'completed',
  },
];

const DUMMY_ALERTS: Alert[] = [
  {
    id: 'ALT-001',
    type: 'emergency',
    title: 'Security Breach Detected',
    message: 'Unauthorized access attempt at Front Gate',
    guardId: 'GND-2024-001',
    guardName: 'John Smith',
    location: 'OmniWatch Headquarters',
    timestamp: '2024-01-17T18:15:00Z',
    priority: 'high',
    status: 'active',
  },
  {
    id: 'ALT-002',
    type: 'warning',
    title: 'Guard Check-in Missed',
    message: 'Mike Davis has not checked in for 30 minutes',
    guardId: 'GND-2024-003',
    guardName: 'Mike Davis',
    location: 'Westside Industrial Park',
    timestamp: '2024-01-17T15:30:00Z',
    priority: 'medium',
    status: 'active',
  },
  {
    id: 'ALT-003',
    type: 'info',
    title: 'Patrol Completed',
    message: 'Routine patrol completed successfully',
    guardId: 'GND-2024-001',
    guardName: 'John Smith',
    location: 'OmniWatch Headquarters',
    timestamp: '2024-01-17T19:30:00Z',
    priority: 'low',
    status: 'acknowledged',
  },
  {
    id: 'ALT-004',
    type: 'maintenance',
    title: 'Camera Maintenance Required',
    message: 'Camera at Parking Lot requires cleaning',
    location: 'Eastgate Shopping Mall',
    timestamp: '2024-01-17T12:00:00Z',
    priority: 'low',
    status: 'resolved',
  },
];

const LOCATIONS = [
  { id: 'loc_1', name: 'OmniWatch Headquarters' },
  { id: 'loc_2', name: 'Eastgate Shopping Mall' },
  { id: 'loc_3', name: 'Westside Industrial Park' },
  { id: 'loc_4', name: 'Northgate Residential Complex' },
  { id: 'loc_5', name: 'Southgate Warehouse Facility' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'guards' | 'patrols' | 'details' | 'alerts' | 'settings'>('guards');

  // Guards Tab State
  const [guards] = useState<Guard[]>(DUMMY_GUARDS);
  const [guardSearchQuery, setGuardSearchQuery] = useState('');
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [guardModalVisible, setGuardModalVisible] = useState(false);

  // Patrols Tab State
  const [patrols] = useState<Patrol[]>(DUMMY_PATROLS);
  const [patrolSearchQuery, setPatrolSearchQuery] = useState('');
  const [patrolFilterLocation] = useState('');
  const [patrolFilterDate] = useState('');
  const [selectedPatrol, setSelectedPatrol] = useState<Patrol | null>(null);
  const [patrolModalVisible, setPatrolModalVisible] = useState(false);

  // Alerts Tab State
  const [alerts] = useState<Alert[]>(DUMMY_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  // Details Tab State
  const [adminProfile] = useState<AdminProfile>({
    name: 'Admin Supervisor',
    id: 'ADM-2024-001',
    company: 'OmniWatch Security',
    role: 'Security Supervisor',
    email: 'admin@omniwatch.com',
    phone: '+1-555-0000',
    department: 'Operations',
    joinDate: '2022-01-01',
    managedGuards: 4,
    totalLocations: 5,
  });

  // Filter guards based on search
  const filteredGuards = guards.filter(guard =>
    guard.name.toLowerCase().includes(guardSearchQuery.toLowerCase()) ||
    guard.location.toLowerCase().includes(guardSearchQuery.toLowerCase())
  );

  // Filter patrols based on search and filters
  const filteredPatrols = patrols.filter(patrol => {
    const matchesSearch = patrol.guardName.toLowerCase().includes(patrolSearchQuery.toLowerCase()) ||
                         patrol.location.toLowerCase().includes(patrolSearchQuery.toLowerCase());
    const matchesLocation = !patrolFilterLocation || patrol.location === patrolFilterLocation;
    const matchesDate = !patrolFilterDate || patrol.startTime.includes(patrolFilterDate);
    return matchesSearch && matchesLocation && matchesDate;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22c55e';
      case 'inactive': return '#ef4444';
      case 'on-break': return '#f59e0b';
      case 'completed': return '#22c55e';
      case 'in-progress': return '#2563eb';
      case 'missed': return '#ef4444';
      default: return '#64748b';
    }
  };

  // Get alert icon
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'emergency': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      case 'maintenance': return 'construct';
      default: return 'notifications';
    }
  };

  // Get alert color
  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // Handle guard selection
  const handleGuardPress = (guard: Guard) => {
    setSelectedGuard(guard);
    setGuardModalVisible(true);
  };

  // Handle patrol selection
  const handlePatrolPress = (patrol: Patrol) => {
    setSelectedPatrol(patrol);
    setPatrolModalVisible(true);
  };

  // Handle alert selection
  const handleAlertPress = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertModalVisible(true);
  };

  // Render Guards Tab
  const renderGuardsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guards by name or location..."
          placeholderTextColor="#64748b"
          value={guardSearchQuery}
          onChangeText={setGuardSearchQuery}
        />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#2563eb" />
          <Text style={styles.statNumber}>{guards.length}</Text>
          <Text style={styles.statLabel}>Total Guards</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
          <Text style={styles.statNumber}>{guards.filter(g => g.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="location" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{LOCATIONS.length}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
      </View>

      {/* Guards List */}
      <Text style={styles.sectionTitle}>Guards</Text>
      {filteredGuards.map((guard) => (
        <TouchableOpacity
          key={guard.id}
          style={styles.guardCard}
          onPress={() => handleGuardPress(guard)}
        >
          <View style={styles.guardHeader}>
            <View style={styles.guardAvatar}>
              <Text style={styles.guardAvatarText}>
                {guard.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.guardInfo}>
              <Text style={styles.guardName}>{guard.name}</Text>
              <Text style={styles.guardLocation}>{guard.location}</Text>
            </View>
            <View style={styles.guardStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(guard.status) }]} />
              <Text style={styles.statusText}>{guard.status.replace('-', ' ')}</Text>
            </View>
          </View>
          <View style={styles.guardDetails}>
            <Text style={styles.guardLastSeen}>Last seen: {guard.lastSeen}</Text>
            <Text style={styles.guardAreas}>Areas: {guard.assignedAreas.join(', ')}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render Patrols Tab
  const renderPatrolsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patrols by guard or location..."
          placeholderTextColor="#64748b"
          value={patrolSearchQuery}
          onChangeText={setPatrolSearchQuery}
        />
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.filterText}>Location</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="calendar" size={16} color="#64748b" />
          <Text style={styles.filterText}>Date</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Patrols List */}
      <Text style={styles.sectionTitle}>Recent Patrols</Text>
      {filteredPatrols.map((patrol) => (
        <TouchableOpacity
          key={patrol.id}
          style={styles.patrolCard}
          onPress={() => handlePatrolPress(patrol)}
        >
          <View style={styles.patrolHeader}>
            <View style={styles.patrolIcon}>
              <Ionicons name="walk" size={20} color="#2563eb" />
            </View>
            <View style={styles.patrolInfo}>
              <Text style={styles.patrolGuard}>{patrol.guardName}</Text>
              <Text style={styles.patrolLocation}>{patrol.location}</Text>
            </View>
            <View style={styles.patrolStatus}>
              <Text style={[styles.statusText, { color: getStatusColor(patrol.status) }]}>
                {patrol.status.replace('-', ' ')}
              </Text>
            </View>
          </View>
          <View style={styles.patrolDetails}>
            <Text style={styles.patrolTime}>
              {formatDate(patrol.startTime)} - {patrol.endTime ? formatDate(patrol.endTime) : 'Ongoing'}
            </Text>
            <Text style={styles.patrolDuration}>Duration: {patrol.duration}</Text>
            <Text style={styles.patrolCheckpoints}>
              Checkpoints: {patrol.checkpoints.length} ({patrol.checkpoints.join(', ')})
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render Alerts Tab
  const renderAlertsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="funnel" size={16} color="#64748b" />
          <Text style={styles.filterText}>Type</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="flag" size={16} color="#64748b" />
          <Text style={styles.filterText}>Priority</Text>
          <Ionicons name="chevron-down" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Alert Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <Text style={styles.statNumber}>{alerts.filter(a => a.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{alerts.filter(a => a.priority === 'high').length}</Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#22c55e" />
          <Text style={styles.statNumber}>{alerts.filter(a => a.status === 'resolved').length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      {/* Alerts List */}
      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      {alerts.map((alert) => (
        <TouchableOpacity
          key={alert.id}
          style={styles.alertCard}
          onPress={() => handleAlertPress(alert)}
        >
          <View style={styles.alertHeader}>
            <View style={[styles.alertIcon, { backgroundColor: getAlertColor(alert.priority) + '20' }]}>
              <Ionicons name={getAlertIcon(alert.type)} size={20} color={getAlertColor(alert.priority)} />
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertLocation}>{alert.location}</Text>
            </View>
            <View style={styles.alertStatus}>
              <View style={[styles.priorityIndicator, { backgroundColor: getAlertColor(alert.priority) }]} />
              <Text style={styles.priorityText}>{alert.priority}</Text>
            </View>
          </View>
          <View style={styles.alertDetails}>
            <Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text>
            <Text style={styles.alertTime}>{formatDate(alert.timestamp)}</Text>
            {alert.guardName && (
              <Text style={styles.alertGuard}>Guard: {alert.guardName}</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render Details Tab
  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {adminProfile.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{adminProfile.name}</Text>
            <Text style={styles.profileRole}>{adminProfile.role}</Text>
            <Text style={styles.profileId}>ID: {adminProfile.id}</Text>
          </View>
        </View>
      </View>

      {/* Company Info */}
      <Text style={styles.sectionTitle}>Company Information</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValue}>{adminProfile.company}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{adminProfile.department}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Join Date</Text>
            <Text style={styles.infoValue}>{new Date(adminProfile.joinDate).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {/* Contact Info */}
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{adminProfile.email}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#2563eb" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{adminProfile.phone}</Text>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <Text style={styles.sectionTitle}>Management Statistics</Text>
      <View style={styles.card}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statItemNumber}>{adminProfile.managedGuards}</Text>
            <Text style={styles.statItemLabel}>Managed Guards</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemNumber}>{adminProfile.totalLocations}</Text>
            <Text style={styles.statItemLabel}>Total Locations</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemNumber}>{patrols.filter(p => p.status === 'completed').length}</Text>
            <Text style={styles.statItemLabel}>Completed Patrols</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statItemNumber}>{patrols.filter(p => p.status === 'in-progress').length}</Text>
            <Text style={styles.statItemLabel}>Active Patrols</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text" size={24} color="#fff" />
          <Text style={styles.actionText}>Generate Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="analytics" size={24} color="#fff" />
          <Text style={styles.actionText}>View Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="call" size={24} color="#fff" />
          <Text style={styles.actionText}>Emergency Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="shield-checkmark" size={24} color="#fff" />
          <Text style={styles.actionText}>System Check</Text>
        </TouchableOpacity>
      </View>
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

      {/* System Settings */}
      <Text style={styles.sectionTitle}>System Settings</Text>
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
            <Text style={styles.settingText}>Location Management</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Ionicons name="people" size={20} color="#2563eb" />
            <Text style={styles.settingText}>Guard Management</Text>
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
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>{adminProfile.company}</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'guards' ? renderGuardsTab() :
         activeTab === 'patrols' ? renderPatrolsTab() :
         activeTab === 'alerts' ? renderAlertsTab() :
         activeTab === 'details' ? renderDetailsTab() :
         renderSettingsTab()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('guards')}
        >
          <Ionicons 
            name={activeTab === 'guards' ? 'people' : 'people-outline'} 
            size={22} 
            color={activeTab === 'guards' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'guards' && styles.bottomTabActive]}>
            Guards
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('patrols')}
        >
          <Ionicons 
            name={activeTab === 'patrols' ? 'walk' : 'walk-outline'} 
            size={22} 
            color={activeTab === 'patrols' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'patrols' && styles.bottomTabActive]}>
            Patrols
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('alerts')}
        >
          <Ionicons 
            name={activeTab === 'alerts' ? 'notifications' : 'notifications-outline'} 
            size={22} 
            color={activeTab === 'alerts' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'alerts' && styles.bottomTabActive]}>
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setActiveTab('details')}
        >
          <Ionicons 
            name={activeTab === 'details' ? 'person' : 'person-outline'} 
            size={22} 
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
            size={22} 
            color={activeTab === 'settings' ? '#2563eb' : '#94a3b8'} 
          />
          <Text style={[styles.bottomTabText, activeTab === 'settings' && styles.bottomTabActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Guard Detail Modal */}
      <Modal
        visible={guardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedGuard && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Guard Details</Text>
                  <TouchableOpacity onPress={() => setGuardModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <View style={styles.guardDetailCard}>
                    <View style={styles.guardDetailHeader}>
                      <View style={styles.guardDetailAvatar}>
                        <Text style={styles.guardDetailAvatarText}>
                          {selectedGuard.name.split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={styles.guardDetailInfo}>
                        <Text style={styles.guardDetailName}>{selectedGuard.name}</Text>
                        <Text style={styles.guardDetailId}>ID: {selectedGuard.id}</Text>
                        <View style={styles.statusBadge}>
                          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedGuard.status) }]} />
                          <Text style={styles.statusBadgeText}>{selectedGuard.status.replace('-', ' ')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Contact Information</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={18} color="#64748b" />
                      <Text style={styles.detailText}>{selectedGuard.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={18} color="#64748b" />
                      <Text style={styles.detailText}>{selectedGuard.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Assignment Details</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="location" size={18} color="#64748b" />
                      <Text style={styles.detailText}>{selectedGuard.location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={18} color="#64748b" />
                      <Text style={styles.detailText}>
                        {selectedGuard.operatingHours.start} - {selectedGuard.operatingHours.end}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="map" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Areas: {selectedGuard.assignedAreas.join(', ')}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Additional Info</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Joined: {new Date(selectedGuard.joinDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="eye" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Last seen: {selectedGuard.lastSeen}</Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionButton}>
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalActionButton}>
                    <Ionicons name="chatbubble" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionButton, styles.editAction]}>
                    <Ionicons name="create" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Patrol Detail Modal */}
      <Modal
        visible={patrolModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPatrolModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPatrol && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Patrol Details</Text>
                  <TouchableOpacity onPress={() => setPatrolModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <View style={styles.patrolDetailCard}>
                    <View style={styles.patrolDetailHeader}>
                      <View style={styles.patrolDetailIcon}>
                        <Ionicons name="walk" size={24} color="#2563eb" />
                      </View>
                      <View style={styles.patrolDetailInfo}>
                        <Text style={styles.patrolDetailGuard}>{selectedPatrol.guardName}</Text>
                        <Text style={styles.patrolDetailLocation}>{selectedPatrol.location}</Text>
                        <View style={styles.statusBadge}>
                          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(selectedPatrol.status) }]} />
                          <Text style={styles.statusBadgeText}>{selectedPatrol.status.replace('-', ' ')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Timeline</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="play" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Started: {formatDate(selectedPatrol.startTime)}</Text>
                    </View>
                    {selectedPatrol.endTime && (
                      <View style={styles.detailRow}>
                        <Ionicons name="stop" size={18} color="#64748b" />
                        <Text style={styles.detailText}>Ended: {formatDate(selectedPatrol.endTime)}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Duration: {selectedPatrol.duration}</Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Checkpoints ({selectedPatrol.checkpoints.length})</Text>
                    {selectedPatrol.checkpoints.map((checkpoint, index) => (
                      <View key={index} style={styles.detailRow}>
                        <Ionicons name="location" size={18} color="#64748b" />
                        <Text style={styles.detailText}>{checkpoint}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedPatrol.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Text style={styles.detailNotes}>{selectedPatrol.notes}</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionButton}>
                    <Ionicons name="map" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>View Route</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalActionButton}>
                    <Ionicons name="document" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Report</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Alert Detail Modal */}
      <Modal
        visible={alertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAlert && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Alert Details</Text>
                  <TouchableOpacity onPress={() => setAlertModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <View style={styles.alertDetailCard}>
                    <View style={styles.alertDetailHeader}>
                      <View style={[styles.alertDetailIcon, { backgroundColor: getAlertColor(selectedAlert.priority) + '20' }]}>
                        <Ionicons name={getAlertIcon(selectedAlert.type)} size={24} color={getAlertColor(selectedAlert.priority)} />
                      </View>
                      <View style={styles.alertDetailInfo}>
                        <Text style={styles.alertDetailTitle}>{selectedAlert.title}</Text>
                        <Text style={styles.alertDetailLocation}>{selectedAlert.location}</Text>
                        <View style={styles.statusBadge}>
                          <View style={[styles.statusIndicator, { backgroundColor: getAlertColor(selectedAlert.priority) }]} />
                          <Text style={styles.statusBadgeText}>{selectedAlert.priority} priority</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Alert Information</Text>
                    <Text style={styles.alertDetailMessage}>{selectedAlert.message}</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Time: {formatDate(selectedAlert.timestamp)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="radio-button-on" size={18} color="#64748b" />
                      <Text style={styles.detailText}>Status: {selectedAlert.status}</Text>
                    </View>
                  </View>

                  {selectedAlert.guardName && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Related Guard</Text>
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={18} color="#64748b" />
                        <Text style={styles.detailText}>{selectedAlert.guardName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="id-card" size={18} color="#64748b" />
                        <Text style={styles.detailText}>ID: {selectedAlert.guardId}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalActionButton}>
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Contact Guard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionButton, styles.resolveAction]}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.modalActionText}>Mark Resolved</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  
  // Search and Filters
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Guards Tab
  guardCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  guardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  guardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  guardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guardLocation: {
    color: '#64748b',
    fontSize: 14,
  },
  guardStatus: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  guardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  guardLastSeen: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  guardAreas: {
    color: '#64748b',
    fontSize: 12,
  },
  
  // Patrols Tab
  patrolCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  patrolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  patrolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patrolInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patrolGuard: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  patrolLocation: {
    color: '#64748b',
    fontSize: 14,
  },
  patrolStatus: {
    alignItems: 'flex-end',
  },
  patrolDetails: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  patrolTime: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  patrolDuration: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  patrolCheckpoints: {
    color: '#64748b',
    fontSize: 12,
  },
  
  // Alerts Tab
  alertCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  alertLocation: {
    color: '#64748b',
    fontSize: 14,
  },
  alertStatus: {
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  priorityText: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  alertDetails: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  alertMessage: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  alertTime: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  alertGuard: {
    color: '#64748b',
    fontSize: 12,
  },
  
  // Details Tab
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileRole: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  profileId: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  infoValue: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statItemNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statItemLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Bottom Tab Bar
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
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editAction: {
    backgroundColor: '#f59e0b',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Guard Detail Modal
  guardDetailCard: {
    marginBottom: 16,
  },
  guardDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardDetailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardDetailAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  guardDetailInfo: {
    flex: 1,
    marginLeft: 16,
  },
  guardDetailName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  guardDetailId: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 14,
    flex: 1,
  },
  
  // Patrol Detail Modal
  patrolDetailCard: {
    marginBottom: 16,
  },
  patrolDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patrolDetailIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patrolDetailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patrolDetailGuard: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  patrolDetailLocation: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  detailNotes: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Alert Detail Modal
  alertDetailCard: {
    marginBottom: 16,
  },
  alertDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertDetailIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertDetailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertDetailTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertDetailLocation: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  alertDetailMessage: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  resolveAction: {
    backgroundColor: '#22c55e',
  },
  
  // Settings Tab
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
