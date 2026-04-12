import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../components/UI';

// Auth screens
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Shared
import LoadDetailScreen from '../screens/shared/LoadDetailScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Carrier
import LoadBoardScreen  from '../screens/carrier/LoadBoardScreen';
import MyBidsScreen     from '../screens/carrier/MyBidsScreen';
import ActiveLoadScreen from '../screens/carrier/ActiveLoadScreen';
import FleetScreen      from '../screens/carrier/FleetScreen';

// Shipper
import MyLoadsScreen    from '../screens/shipper/MyLoadsScreen';
import PostLoadScreen   from '../screens/shipper/PostLoadScreen';
import LoadBidsScreen   from '../screens/shipper/LoadBidsScreen';
import PODReviewScreen  from '../screens/shipper/PODReviewScreen';

// POD submission (carrier)
import PODSubmitScreen  from '../screens/carrier/PODSubmitScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const HEADER = {
  headerStyle:      { backgroundColor: Colors.primary, shadowColor: 'transparent', elevation: 0 },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerBackTitleVisible: false,
};

// ── Carrier tab navigator ─────────────────────────────────────────────────────
function CarrierTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Board:   focused ? 'list'         : 'list-outline',
            Bids:    focused ? 'pricetag'     : 'pricetag-outline',
            Active:  focused ? 'navigate'     : 'navigate-outline',
            Fleet:   focused ? 'bus'          : 'bus-outline',
            Profile: focused ? 'person'       : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle:             { borderTopColor: Colors.border, paddingBottom: 4 },
        headerStyle:             { backgroundColor: Colors.primary },
        headerTintColor:         '#fff',
        headerTitleStyle:        { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Board"   component={LoadBoardScreen}  options={{ title: 'Load Board' }} />
      <Tab.Screen name="Bids"    component={MyBidsScreen}     options={{ title: 'My Bids' }} />
      <Tab.Screen name="Active"  component={ActiveLoadScreen} options={{ title: 'Active Load' }} />
      <Tab.Screen name="Fleet"   component={FleetScreen}      options={{ title: 'Fleet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}    options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Shipper tab navigator ─────────────────────────────────────────────────────
function ShipperTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Loads:   focused ? 'cube'         : 'cube-outline',
            Post:    focused ? 'add-circle'   : 'add-circle-outline',
            Profile: focused ? 'person'       : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle:             { borderTopColor: Colors.border, paddingBottom: 4 },
        headerStyle:             { backgroundColor: Colors.primary },
        headerTintColor:         '#fff',
        headerTitleStyle:        { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Loads"   component={MyLoadsScreen}   options={{ title: 'My Loads' }} />
      <Tab.Screen name="Post"    component={PostLoadScreen}   options={{ title: 'Post a Load' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}    options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Root stack (wraps tabs + modal screens) ───────────────────────────────────
export default function RootNavigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={HEADER}>
        {!user ? (
          // ── Unauthenticated ───────────────────────────────────────────────
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
          </>
        ) : (
          // ── Authenticated ────────────────────────────────────────────────
          <>
            <Stack.Screen
              name="Main"
              component={user.role === 'carrier' ? CarrierTabs : ShipperTabs}
              options={{ headerShown: false }}
            />
            {/* Shared modal / push screens */}
            <Stack.Screen name="LoadDetail"     component={LoadDetailScreen}    options={{ title: 'Load Details' }} />
            <Stack.Screen name="LoadBids"       component={LoadBidsScreen}      options={{ title: 'Bids' }} />
            <Stack.Screen name="PODSubmit"      component={PODSubmitScreen}     options={{ title: 'Submit Delivery Proof' }} />
            <Stack.Screen name="PODReview"      component={PODReviewScreen}     options={{ title: 'Review POD' }} />
            <Stack.Screen name="Notifications"  component={NotificationsScreen} options={{ title: 'Notifications' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
