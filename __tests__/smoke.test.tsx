import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Minimal component used to verify the Jest + React Native Testing Library
// toolchain (TS transform, preset, renderer) end to end.
function Greeting({ name }: { name: string }) {
  return <Text>Hello, {name}!</Text>;
}

describe('test setup', () => {
  it('renders a React Native component', () => {
    render(<Greeting name="Shiparoo" />);

    expect(screen.getByText('Hello, Shiparoo!')).toBeTruthy();
  });
});
