import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen({ navigation }) {
  const isDark = useColorScheme() === 'dark';

  return (
    <LinearGradient
      colors={isDark ? ['#004225', '#006747'] : ['#a8dadc', '#f1faee']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Image
        source={{
          uri: 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-original-577x577/s3/032019/untitled-1_245.png?EuR0js7pQyJ3HEZXIN0ViZRGXy5n.YK3&itok=TA6gFLzx.png',
        }}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text
        style={[
          styles.title,
          { color: isDark ? '#d4f4dd' : '#004225' },
        ]}
      >
        KNUST SECURITY APP
      </Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? '#7ed957' : '#004225' }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? '#7ed957' : '#004225' }]}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});
