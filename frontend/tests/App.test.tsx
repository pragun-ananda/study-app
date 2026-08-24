import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../src/App';
import { useStore } from '../src/store/useStore';

// Mock SceneCanvas to isolate App keyboard controls and DOM mounting
vi.mock('../src/components/canvas/SceneCanvas', () => ({
  default: () => <div data-testid="mock-scene-canvas">3D Canvas Viewport</div>
}));

describe('App Component', () => {
  beforeEach(() => {
    useStore.getState().resetState();
  });

  it('sets document title to Knowledge Graph on mount', () => {
    render(<App />);
    expect(document.title).toBe('Knowledge Graph');
  });

  it('renders SceneCanvas mock and TelemetryHUD', () => {
    render(<App />);
    expect(screen.getByTestId('mock-scene-canvas')).toBeInTheDocument();
    expect(screen.getByText(/MASTERY/i)).toBeInTheDocument();
  });

  it('handles KeyH shortcut to toggle HUD visibility', () => {
    render(<App />);
    expect(useStore.getState().hudVisible).toBe(true);

    fireEvent.keyDown(window, { code: 'KeyH' });
    expect(useStore.getState().hudVisible).toBe(false);

    fireEvent.keyDown(window, { code: 'KeyH' });
    expect(useStore.getState().hudVisible).toBe(true);
  });

  it('handles KeyO shortcut to toggle overload state', () => {
    render(<App />);
    expect(useStore.getState().isOverloaded).toBe(false);

    fireEvent.keyDown(window, { code: 'KeyO' });
    expect(useStore.getState().isOverloaded).toBe(true);
    expect(useStore.getState().systemStatus).toBe('OVERLOADED');

    fireEvent.keyDown(window, { code: 'KeyO' });
    expect(useStore.getState().isOverloaded).toBe(false);
    expect(useStore.getState().systemStatus).toBe('OPTIMAL');
  });

  it('handles KeyR shortcut to reset state', () => {
    render(<App />);
    act(() => {
      useStore.getState().setSearchQuery('temporary query');
    });
    expect(useStore.getState().searchQuery).toBe('temporary query');

    act(() => {
      fireEvent.keyDown(window, { code: 'KeyR' });
    });
    expect(useStore.getState().searchQuery).toBe('');
  });

  it('ignores shortcuts when user is focused inside an input element', () => {
    render(<App />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { code: 'KeyH' });
    expect(useStore.getState().hudVisible).toBe(true); // Should not toggle

    document.body.removeChild(input);
  });
});
