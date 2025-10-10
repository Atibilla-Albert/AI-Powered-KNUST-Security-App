import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons'; // For eye icon
import { loginUser } from '../Services/api'; // Import the login API function

export default function LoginScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true); // State for password visibility

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await loginUser({ email, password });
      console.log("Login response:", response);

      const tokens = response.data?.tokens;

      const accessToken = tokens?.AccessToken || tokens?.accessToken;
      const refreshToken = tokens?.RefreshToken || tokens?.refreshToken;
      const idToken = tokens?.IdToken || tokens?.idToken;

      if (!accessToken) {
        throw new Error("Login succeeded but no token received.");
      }

      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken || '');
      await AsyncStorage.setItem('idToken', idToken || '');

      navigation.navigate("Dashboard");
    } catch (err) {
      console.log("Login error:", err);
      let errorMessage = "An unexpected error occurred. Please try again.";

      // Handle Axios errors
      if (err.response) {
        const { data } = err.response;
        // Check for Cognito error codes or messages
        if (data?.error?.code === 'NotAuthorizedException' || data?.message?.includes('Incorrect username or password')) {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else if (data?.error?.code === 'UserNotFoundException') {
          errorMessage = "No account found with this email. Please sign up.";
        } else if (data?.error?.code === 'UserNotConfirmedException') {
          errorMessage = "Account not confirmed. Please check your email for verification.";
        } else if (data?.message) {
          errorMessage = data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <LinearGradient
      colors={isDark ? ['#003c2b', '#006747'] : ['#f1faee', '#d8f3dc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.card}
      >
        <Text style={[styles.title, { color: isDark ? '#7ed957' : '#004225' }]}>Login</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
          style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            secureTextEntry={secureTextEntry}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight, { flex: 1 }]}
          />
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
            <Icon
              name={secureTextEntry ? 'visibility-off' : 'visibility'}
              size={24}
              color={isDark ? '#7ed957' : '#004225'}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? '#7ed957' : '#004225', opacity: loading ? 0.7 : 1 },
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Don’t have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Signup')}>
            Sign up
          </Text>
        </Text>

        <Text style={{ fontSize: 12, textAlign: 'center', color: '#999', marginTop: 24 }}>
          🔐 Powered by AI & AWS
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

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
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputDark: {
    borderColor: '#7ed957',
    backgroundColor: '#062e24',
    color: '#7ed957',
  },
  inputLight: {
    borderColor: '#004225',
    backgroundColor: '#ffffff',
    color: '#004225',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12,
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
    textAlign: 'center',
    color: '#60a5fa',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
});