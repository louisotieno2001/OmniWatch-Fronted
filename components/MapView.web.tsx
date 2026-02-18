import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapViewProps, MarkerProps, PolylineProps } from 'react-native-maps'; // Import types for compatibility

// Dummy MapView for web
const MapView: React.FC<MapViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.mapWeb, style]}>
      <Text style={styles.mapWebText}>Map is not supported on web in this version.</Text>
      <Text style={styles.mapWebTextSmall}>(Using a web placeholder)</Text>
      {/* Optionally render children if they are non-map specific elements */}
      {children}
    </View>
  );
};

// Dummy Marker for web
const Marker: React.FC<MarkerProps> = () => {
  return null; // Markers are not visible on the dummy map
};

// Dummy Polyline for web
const Polyline: React.FC<PolylineProps> = () => {
  return null; // Polylines are not visible on the dummy map
};

export { MapView, Marker, Polyline };

const styles = StyleSheet.create({
  mapWeb: {
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150, // Ensure it's visible
  },
  mapWebText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapWebTextSmall: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
});
