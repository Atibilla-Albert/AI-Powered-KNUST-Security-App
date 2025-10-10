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
import { Auth } from 'aws-amplify';

export default function ResetPasswordScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';

  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      await Auth.forgotPassword(email);
      setCodeSent(true);
      Alert.alert('Code Sent', 'A confirmation code has been sent to your email.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      // 🔐 Auto sign in after reset
      const user = await Auth.signIn(email, newPassword);
      Alert.alert('Success', 'Password reset successful. You are now logged in.', [
        {
          text: 'Continue',
          onPress: () => navigation.navigate('Dashboard'),
        },
      ]);
    } catch (err) {
      Alert.alert('Reset Failed', err.message || 'Please try again');
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
          Reset Password
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

        {codeSent && (
          <>
            <TextInput
              placeholder="Confirmation Code"
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
              style={[styles.input, inputStyle(isDark)]}
            />
            <TextInput
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={isDark ? '#cbd5e1' : '#64748b'}
              style={[styles.input, inputStyle(isDark)]}
            />
          </>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isDark ? '#7ed957' : '#004225',
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={codeSent ? handleResetPassword : handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {codeSent ? 'Reset Password' : 'Send Code'}
            </Text>
          )}
        </TouchableOpacity>
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
});
