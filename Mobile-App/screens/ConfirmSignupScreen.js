 // Adjust the import path as necessary
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import {confirmRegistration } from '../Services/api'; // Adjust the import path as necessary


export default function ConfirmSignupScreen({ navigation, route }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email); // pre-fill email from signup screen
    }
  }, [route]);

  const handleConfirm = async () => {
  setLoading(true);
  try {
  await confirmRegistration({ email, code });
  navigation.navigate('Login');
} catch (err) {
  const errorMessage =
    err.response?.data?.message || err.message || 'Something went wrong';
  console.log('Confirmation error:', errorMessage);
  Alert.alert('Error', errorMessage);
}
 finally {
    setLoading(false);
  }
};


  return (
    <LinearGradient
      colors={isDark ? ['#003c2b', '#005738'] : ['#e0f2f1', '#f1faee']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.card}
      >
        <Text style={[styles.title, { color: isDark ? '#7ed957' : '#004225' }]}>
          Confirm Your Email
        </Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, inputStyle(isDark)]}
        />

        <TextInput
          placeholder="Confirmation Code"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, inputStyle(isDark)]}
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isDark ? '#7ed957' : '#004225',
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Confirm</Text>
          )}
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 14,
            textAlign: 'center',
            color: isDark ? '#ccc' : '#444',
            marginTop: 8,
          }}
        >
          Didn't receive the code?{' '}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('ResendConfirmation')}
          >
            Resend Code
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const inputStyle = (isDark) =>
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
      };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
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
  button: {
    borderRadius: 12,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
