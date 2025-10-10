import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { getMyIncidents } from '../Services/api';

export default function IncidentListScreen() {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await getMyIncidents();
      const data = res?.data || [];
      setIncidents(data);
      setFilteredIncidents(data);
    } catch (error) {
      const code = error?.response?.status;

      if (code === 401 || code === 403) {
        Toast.show({
          type: 'error',
          text1: 'Session expired',
          text2: 'Please log in again.',
        });

        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Error fetching incidents:', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const filterSearch = (text) => {
    setSearch(text);
    if (text) {
      const filtered = incidents.filter((item) =>
        (item.title && item.title.toLowerCase().includes(text.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(text.toLowerCase())) ||
        (item.incidentType && getIncidentTypeLabel(item.incidentType).toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredIncidents(filtered);
    } else {
      setFilteredIncidents(incidents);
    }
  };

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getIncidentTypeLabel = (type) => {
    const typeMap = {
      'PHYSICAL_SECURITY': 'Physical Security',
      'CYBER_SECURITY_INCIDENT': 'Cyber Security',
      'SUSPICIOUS_ACTIVITY': 'Suspicious Activity',
      'SAFETY_HAZARD': 'Safety Hazard',
    };
    return typeMap[type] || type;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING': { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
      'IN_PROGRESS': { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe' },
      'RESOLVED': { label: 'Resolved', color: '#10b981', bg: '#d1fae5' },
      'CLOSED': { label: 'Closed', color: '#6b7280', bg: '#f3f4f6' },
    };
    return statusMap[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  };

  const backgroundColors = isDark ? ['#003c2b', '#005738'] : ['#f1faee', '#d8f3dc'];

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, { color: isDark ? '#7ed957' : '#004225' }]}>
          My Incident Reports
        </Text>

        <TextInput
          placeholder="Search incidents..."
          value={search}
          onChangeText={filterSearch}
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[
            styles.input,
            isDark
              ? {
                  borderColor: '#7ed957',
                  backgroundColor: '#062e24',
                  color: '#7ed957',
                }
              : {
                  borderColor: '#004225',
                  backgroundColor: '#ffffff',
                  color: '#004225',
                },
          ]}
        />

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={isDark ? '#7ed957' : '#004225'} />
            <Text style={[styles.loadingText, { color: isDark ? '#7ed957' : '#004225' }]}>
              Loading your incidents...
            </Text>
          </View>
        ) : filteredIncidents.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons 
              name="document-outline" 
              size={64} 
              color={isDark ? '#7ed957' : '#004225'} 
            />
            <Text style={[styles.noData, { color: isDark ? '#7ed957' : '#004225' }]}>
              {search ? 'No incidents match your search.' : 'No incidents reported yet.'}
            </Text>
            {!search && (
              <Text style={[styles.noDataSubtext, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                Report your first incident to get started.
              </Text>
            )}
          </View>
        ) : (
          filteredIncidents.map((incident, index) => {
            const statusBadge = getStatusBadge(incident.status);
            const severityColor = getSeverityColor(incident.severity);
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#062e24' : '#ffffff',
                  },
                ]}
                onPress={() => {
                  // TODO: Navigate to incident detail screen
                  console.log('View incident details:', incident.id);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: isDark ? '#7ed957' : '#004225' }]}>
                      {incident.title || getIncidentTypeLabel(incident.incidentType)}
                    </Text>
                    <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                      <Text style={styles.severityText}>{incident.severity?.toUpperCase() || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.statusText, { color: statusBadge.color }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardText, { color: isDark ? '#cbd5e1' : '#4b5563' }]}>
                  {incident.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.cardMeta}>
                    <Ionicons 
                      name="location-outline" 
                      size={16} 
                      color={isDark ? '#7ed957' : '#004225'} 
                    />
                    <Text style={[styles.metaText, { color: isDark ? '#7ed957' : '#004225' }]}>
                      {getIncidentTypeLabel(incident.incidentType)}
                    </Text>
                  </View>
                  
                  {incident.mediaCount > 0 && (
                    <View style={styles.cardMeta}>
                    <Ionicons 
                      name="images-outline" 
                      size={16} 
                      color={isDark ? '#7ed957' : '#004225'} 
                    />
                    <Text style={[styles.metaText, { color: isDark ? '#7ed957' : '#004225' }]}>
                      {incident.mediaCount} media
                    </Text>
                  </View>
                  )}
                </View>

                <Text style={[styles.timestamp, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  {formatTimestamp(incident.createdAt || incident.timestamp)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.footer}>📊 Stay informed. Stay safe.</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  noData: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
  },
});
