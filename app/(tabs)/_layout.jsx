import { View, Text, Image } from 'react-native'
import React from 'react'
import { Tabs, Redirect } from 'expo-router';
import { icons } from '../../constants';
import { AppProvider } from './AppContext';

const TabIcon = ({ icon, color, name, focused}) => {
  return (
    <View className="items-center justify-center gap-2" style={{ width: 90, height: 70, paddingTop: 16 }}>
      <Image source={icon} resizeMode='contain' tintColor={color} className="w-6 h-6" />
      <Text className={`${focused ? 'font-psemibold' : 'font-pregular'} text-xs`} style={{ color: color }}> {name} </Text>
    </View>
  )
}

const TabsLayout = () => {
  return (
    <AppProvider>
      <Tabs screenOptions={{
        tabBarShowLabel: false, 
        tabBarActiveTintColor: '#5A9BD4',
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarStyle: {
          backgroundColor: '#161622',
          borderTopWidth: 1,
          borderTopColor: '#232533',
          height: 78
        }
      }} >
        <Tabs.Screen name="profile" 
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.profile} color={color} name="Profile" focused={focused} />
            )
          }}
        />
        <Tabs.Screen name="myShelf" 
          options={{
            title: "My Shelf",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.home} color={color} name="My Shelf" focused={focused} />
            )
          }}
        />
        <Tabs.Screen name="scan" 
          options={{
            title: "Scan",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.search} color={color} name="Scan" focused={focused} />
            )
          }}
        />
        <Tabs.Screen name="bookmark" 
          options={{
            title: "Bookmark",
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon={icons.bookmark} color={color} name="Bookmark" focused={focused} />
            )
          }}
        />
      </Tabs>
    </AppProvider>
  )
}

export default TabsLayout