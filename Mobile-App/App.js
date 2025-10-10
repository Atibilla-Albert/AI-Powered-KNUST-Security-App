import React from 'react';
import * as native from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

// Screens
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ConfirmSignupScreen from './screens/ConfirmSignupScreen';
import ReportScreen from './screens/Emergency';
import DashboardScreen from './screens/DashboardScreen';
import ReportIncidentScreen from './screens/ReportIncidentScreen';
import IncidentListScreen from './screens/IncidentListScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <native.NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ConfirmSignupScreen" component={ConfirmSignupScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
          <Stack.Screen name="IncidentList" component={IncidentListScreen} />
        </Stack.Navigator>
         <Toast />
      </native.NavigationContainer>
     
    </>
  );
}
