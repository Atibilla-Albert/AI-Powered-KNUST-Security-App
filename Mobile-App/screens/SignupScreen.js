import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {registerUser} from '../Services/api'; // Custom backend API

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isDark = useColorScheme() === 'dark';

  const isStrongPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;
    return regex.test(password);
  };

  const handleSignUp = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 12 characters long and include uppercase, lowercase, number, and symbol.'
      );
      return;
    }

    const payload = {
     email,
   password,
   attributes: {
    'custom:firstName': firstName,
    'custom:lastName': lastName,
  }
    };

    console.log('Registering with:', payload);

    setLoading(true);
    try {
      const response = await registerUser( payload );

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Check your email to confirm your account.');
        navigation.navigate('ConfirmSignupScreen', { email });
      } else {
        Alert.alert('Signup Failed', 'Unexpected response from server.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'User already exists.'
          : 'Network or server error.');
      Alert.alert('Signup Error', msg);
      console.error('Signup error:', err.response?.data || err);
    } finally {
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
          Create Account
        </Text>

        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, inputStyle(isDark)]}
        />
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, inputStyle(isDark)]}
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, inputStyle(isDark)]}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
            style={[styles.input, styles.passwordInput, inputStyle(isDark)]}
          />
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={22}
              color={isDark ? '#7ed957' : '#004225'}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isDark ? '#7ed957' : '#004225',
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
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
          Already have an account?{' '}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
          >
            Login
          </Text>
        </Text>

        <Text
          style={{
            fontSize: 12,
            textAlign: 'center',
            color: '#999',
            marginTop: 24,
          }}
        >
          🔐 Powered by AI & AWS
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
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  iconContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
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
