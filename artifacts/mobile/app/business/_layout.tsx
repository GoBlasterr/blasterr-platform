import React from 'react';
import { Stack } from 'expo-router';

export default function BusinessLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="[slug]/index" />
      <Stack.Screen name="[slug]/claim" />
      <Stack.Screen name="[slug]/center" />
    </Stack>
  );
}
