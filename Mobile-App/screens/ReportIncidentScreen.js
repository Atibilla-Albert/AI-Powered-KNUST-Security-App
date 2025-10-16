import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Appearance,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Video } from 'expo-av';
import mime from 'mime';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  reportIncident,
  getIncidentMediaUploadUrl,
  uploadToS3,
  addIncidentAttachment,
} from '../Services/api';
import FloatingSOSButton from './Emergency';

export default function ReportScreen({ navigation }) {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme() || 'light');
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme || 'light');
    });
    return () => subscription.remove();
  }, []);

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('low');
  const [incidentType, setIncidentType] = useState(null);
  const [media, setMedia] = useState([]);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sound, setSound] = useState(null);
  const [severityOpen, setSeverityOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [location, setLocation] = useState(null);

  const [severityItems, setSeverityItems] = useState([
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ]);
  const [typeItems, setTypeItems] = useState([
    { label: 'Physical Security', value: 'PHYSICAL_SECURITY' },
    { label: 'Cyber Security Incident', value: 'CYBER_SECURITY_INCIDENT' },
    { label: 'Suspicious Activity', value: 'SUSPICIOUS_ACTIVITY' },
    { label: 'Safety Hazard', value: 'SAFETY_HAZARD' },
  ]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Camera and media library permissions are needed.');
      return false;
    }
    return true;
  };

  const pickMedia = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.7,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        const newMedia = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type || 'image',
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
        }));

        const validMedia = newMedia.filter((item) => {
          if (item.fileSize && item.fileSize > 50 * 1024 * 1024) {
            Alert.alert('File Too Large', `${item.type === 'video' ? 'Video' : 'Image'} file is too large. Please select a file smaller than 50MB.`);
            return false;
          }
          return true;
        });

        setMedia((prev) => [...prev, ...validMedia]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const newMedia = {
          uri: asset.uri,
          type: asset.type || 'image',
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
        };

        if (newMedia.fileSize && newMedia.fileSize > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', `${newMedia.type === 'video' ? 'Video' : 'Image'} file is too large. Please try again with a smaller file.`);
          return;
        }

        setMedia((prev) => [...prev, newMedia]);
      }
    } catch (error) {
      console.error('Error taking photo/video:', error);
      Alert.alert('Error', 'Failed to capture media. Please try again.');
    }
  };

  const removeMedia = (uri) => {
    setMedia((prev) => prev.filter((item) => item.uri !== uri));
  };

  const startRecording = async () => {
    try {
      console.log('Requesting recording permissions...');
      
      let permissionResponse;
      try {
        permissionResponse = await Audio.requestPermissionsAsync();
      } catch (permError) {
        console.log('Standard permission request failed, trying alternative...');
        try {
          permissionResponse = await Audio.getPermissionsAsync();
          if (!permissionResponse.granted) {
            permissionResponse = await Audio.requestPermissionsAsync();
          }
        } catch (altError) {
          console.error('Alternative permission method also failed:', altError);
          Alert.alert('Permission Error', 'Unable to request microphone permissions. Please check your expo-av installation.');
          return;
        }
      }

      if (permissionResponse.status !== 'granted' && !permissionResponse.granted) {
        Alert.alert('Permission Needed', 'Microphone access is required to record audio.');
        return;
      }

      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Creating recording...');
      let recordingOptions;
      try {
        recordingOptions = Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY;
      } catch (presetError) {
        console.log('Using custom recording options...');
        recordingOptions = {
          android: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        };
      }

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(recording);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Start recording failed:', err);
      Alert.alert('Recording Error', `Could not start recording: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log('No recording to stop');
      return;
    }

    try {
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped, URI:', uri);
      
      if (uri) {
        setAudioUri(uri);
        Alert.alert('Success', 'Voice recording saved successfully!');
      } else {
        throw new Error('Recording URI is null');
      }
    } catch (err) {
      console.error('Stop recording failed:', err);
      Alert.alert('Recording Error', `Could not save recording: ${err.message}`);
    } finally {
      setRecording(null);
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (resetError) {
        console.error('Failed to reset audio mode:', resetError);
      }
    }
  };

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const playRecording = async () => {
    if (!audioUri) {
      Alert.alert('No Recording', 'No voice recording to play.');
      return;
    }

    try {
      console.log('Playing recording from:', audioUri);
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      try {
        const playbackConfig = {
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        };
        if (Audio && typeof Audio.setAudioModeAsync === 'function') {
          await Audio.setAudioModeAsync(playbackConfig);
        } else if (AudioModule && typeof AudioModule.setAudioModeAsync === 'function') {
          await AudioModule.setAudioModeAsync(playbackConfig);
        }
      } catch (modeError) {
        console.log('Audio mode setting failed for playback, continuing anyway:', modeError);
      }

      let newSound;
      try {
        if (Audio && Audio.Sound) {
          const soundResult = await Audio.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true, isLooping: false }
          );
          newSound = soundResult.sound;
        } else if (AudioModule && AudioModule.Sound) {
          const soundResult = await AudioModule.Sound.createAsync(
            { uri: audioUri },
            { shouldPlay: true, isLooping: false }
          );
          newSound = soundResult.sound;
        } else {
          throw new Error('No Sound class available');
        }
      } catch (soundError) {
        console.error('Sound creation failed:', soundError);
        throw new Error(`Could not create sound: ${soundError.message}`);
      }
      
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          console.log('Playback finished');
          newSound.unloadAsync();
          setSound(null);
        }
      });

    } catch (err) {
      console.error('Error playing recording:', err);
      Alert.alert('Playback Error', `Could not play recording: ${err.message}`);
    }
  };

  const removeAudio = () => {
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setAudioUri(null);
    Alert.alert('Removed', 'Voice recording removed.');
  };

  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  const extractFileName = (uri) => {
    return uri.split('/').pop() || `file-${Date.now()}`;
  };

  // ✅ updated normalizeContentType
  const normalizeContentType = (contentType, fileName = '') => {
    const mimeMap = {
      'video/quicktime': 'video/mp4',
      'audio/x-m4a': 'audio/m4a',
      'audio/mp4': 'audio/m4a',
    };
    if (fileName.toLowerCase().endsWith('.m4a')) {
      return 'audio/m4a';
    }
    return mimeMap[contentType] || contentType;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please describe the incident.');
      return;
    }
    if (!incidentType) {
      Alert.alert('Missing Type', 'Please select an incident type.');
      return;
    }
    if (!location) {
      Alert.alert('Missing Location', 'Location data is required.');
      return;
    }

    setUploading(true);
    try {
      const incidentData = {
        description,
        severity,
        incidentType,
        location: {
          latitude: parseFloat(location.latitude.toFixed(3)),
          longitude: parseFloat(location.longitude.toFixed(3)),
        },
      };
      console.log('Reporting incident with data:', JSON.stringify(incidentData, null, 2));

      const incidentRes = await reportIncident(incidentData).catch((err) => {
        console.error('Raw incident response or error:', err.response?.data || err.message);
        throw err;
      });

      let incidentId = incidentRes?.data?.id || incidentRes?.data?.incidentId;
      console.log('Processed incident response:', JSON.stringify(incidentRes, null, 2));
      if (typeof incidentId === 'object' && incidentId !== null) {
        incidentId = incidentId.toString() || (incidentId.id ? incidentId.id.toString() : Object.values(incidentId)[0]?.toString());
      }
      if (!incidentId || typeof incidentId !== 'string') {
        console.error('Invalid incidentId extracted:', incidentId);
        throw new Error('Invalid or missing incident ID from backend');
      }

      const mediaFiles = [...media.map((item) => item.uri)];
      if (audioUri) mediaFiles.push(audioUri);

      const uploads = mediaFiles.map(async (uri) => {
        const fileName = extractFileName(uri);
        let contentType = mime.getType(uri) || 'application/octet-stream';
        contentType = normalizeContentType(contentType, fileName);
        console.log('Getting upload URL for:', { incidentId, fileName, contentType });
        const presignRes = await getIncidentMediaUploadUrl(incidentId, fileName, contentType);
        await uploadToS3(presignRes.data.url, uri, contentType);
        // Add attachment to incident after successful upload
        await addIncidentAttachment(incidentId, presignRes.data.key);
        return presignRes.data.key;
      });

      await Promise.all(uploads);

      Alert.alert('Success', 'Incident reported successfully!');
      setDescription('');
      setMedia([]);
      setAudioUri(null);
      setRecording(null);
      setSound(null);
      setSeverity('low');
      setIncidentType(null);
      setTypeOpen(false);
      setSeverityOpen(false);
      navigation.navigate('Dashboard');
    } catch (err) {
      console.error('Report Error:', err.response?.data || err.message);
      Alert.alert('Error', `Failed to report incident: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={isDark ? ['#003f3f', '#004f2f'] : ['#e0f2fe', '#bae6fd']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#7ed957' : '#004225' }]}>
            Report Incident
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Describe the incident in detail..."
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor={isDark ? '#cbd5e1' : '#4b5563'}
              style={[
                styles.textInput,
                {
                  borderColor: isDark ? '#7ed957' : '#004225',
                  color: isDark ? '#7ed957' : '#004225',
                  backgroundColor: isDark ? '#001f1f' : '#ffffff',
                },
              ]}
            />
            <TouchableOpacity onPress={toggleRecording} style={styles.micButton}>
              <Ionicons
                name={recording ? 'stop' : 'mic'}
                size={24}
                color={recording ? 'red' : isDark ? '#7ed957' : '#004225'}
              />
            </TouchableOpacity>
          </View>

          {recording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { color: isDark ? '#7ed957' : '#004225' }]}>
                Recording...
              </Text>
            </View>
          )}

          {audioUri && (
            <View style={styles.audioContainer}>
              <TouchableOpacity onPress={playRecording} style={styles.playButton}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.playButtonText}>Play Voice Note</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={removeAudio} style={styles.removeAudioButton}>
                <Ionicons name="trash" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <DropDownPicker
            open={typeOpen}
            value={incidentType}
            items={typeItems}
            setOpen={setTypeOpen}
            setValue={setIncidentType}
            setItems={setTypeItems}
            placeholder="Select Incident Type"
            dropDownDirection="BOTTOM"
            zIndex={3000}
            style={[
              styles.picker,
              {
                borderColor: isDark ? '#7ed957' : '#004225',
                backgroundColor: isDark ? '#001f1f' : '#ffffff',
              },
            ]}
            textStyle={{ color: isDark ? '#7ed957' : '#004225', fontSize: 16 }}
            dropDownContainerStyle={{
              borderColor: isDark ? '#7ed957' : '#004225',
              backgroundColor: isDark ? '#001f1f' : '#fff',
            }}
          />

          <DropDownPicker
            open={severityOpen}
            value={severity}
            items={severityItems}
            setOpen={setSeverityOpen}
            setValue={setSeverity}
            setItems={setSeverityItems}
            placeholder="Select Severity"
            dropDownDirection="BOTTOM"
            zIndex={2000}
            style={[
              styles.picker,
              {
                borderColor: isDark ? '#7ed957' : '#004225',
                backgroundColor: isDark ? '#001f1f' : '#ffffff',
              },
            ]}
            textStyle={{ color: isDark ? '#7ed957' : '#004225', fontSize: 16 }}
            dropDownContainerStyle={{
              borderColor: isDark ? '#7ed957' : '#004225',
              backgroundColor: isDark ? '#001f1f' : '#fff',
            }}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={pickMedia} style={[styles.actionButton, { backgroundColor: '#10b981' }]}>
              <Text style={styles.actionButtonText}>Pick Media</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={[styles.actionButton, { backgroundColor: '#10b981' }]}>
              <Text style={styles.actionButtonText}>Take Photo/Video</Text>
            </TouchableOpacity>
          </View>

          {media.length > 0 && (
            <Text style={[styles.mediaCount, { color: isDark ? '#7ed957' : '#004225' }]}>
              📸 {media.length} media item{media.length > 1 ? 's' : ''} selected
            </Text>
          )}

          {media.map((item, idx) => (
            <View key={idx} style={styles.mediaContainer}>
              {item.type === 'video' ? (
                <Video
                  source={{ uri: item.uri }}
                  style={styles.media}
                  useNativeControls
                  resizeMode="cover"
                  shouldPlay={false}
                />
              ) : (
                <Image source={{ uri: item.uri }} style={styles.media} />
              )}
              <TouchableOpacity onPress={() => removeMedia(item.uri)}>
                <Text style={styles.removeMediaText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={uploading}
            style={[
              styles.submitButton,
              { backgroundColor: isDark ? '#7ed957' : '#004225' },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
        <FloatingSOSButton />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  content: { flex: 1 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 25 },
  inputContainer: { position: 'relative', marginBottom: 20 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    minHeight: 100,
  },
  micButton: { position: 'absolute', right: 10, bottom: 10 },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginRight: 8 },
  recordingText: { fontSize: 14, fontWeight: '500' },
  audioContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  playButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  playButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  removeAudioButton: { backgroundColor: '#ef4444', padding: 8, borderRadius: 6, marginLeft: 8 },
  picker: { marginBottom: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  actionButton: { padding: 12, borderRadius: 10, flex: 1, marginHorizontal: 4 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  mediaCount: { textAlign: 'center', marginBottom: 10, fontSize: 14 },
  mediaContainer: { marginBottom: 12 },
  media: { width: '100%', height: 180, borderRadius: 10 },
  removeMediaText: { color: 'red', textAlign: 'center', marginTop: 5 },
  submitButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
