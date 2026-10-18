import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExcalidrawCanvas, ARCHITECTURE_PRESETS } from '../../src/components/hud/ExcalidrawCanvas';

describe('ExcalidrawCanvas Component', () => {
  it('renders the architecture presets toolbar with all 6 presets', () => {
    render(<ExcalidrawCanvas />);

    expect(screen.getByTestId('excalidraw-preset-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('add-preset-load_balancer')).toHaveTextContent('Load Balancer');
    expect(screen.getByTestId('add-preset-api_gateway')).toHaveTextContent('API Gateway');
    expect(screen.getByTestId('add-preset-microservice')).toHaveTextContent('Microservice');
    expect(screen.getByTestId('add-preset-cache')).toHaveTextContent('Redis Cache');
    expect(screen.getByTestId('add-preset-stream')).toHaveTextContent('Kafka Stream');
    expect(screen.getByTestId('add-preset-database')).toHaveTextContent('Database');
  });

  it('renders the action buttons for zoom-to-fit and canvas clearing', () => {
    render(<ExcalidrawCanvas />);

    expect(screen.getByTestId('canvas-zoom-to-fit-btn')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-clear-btn')).toBeInTheDocument();
  });

  it('renders the Excalidraw container host and canvas mock', () => {
    render(<ExcalidrawCanvas height="450px" />);

    expect(screen.getByTestId('excalidraw-container-host')).toBeInTheDocument();
    expect(screen.getByTestId('mock-excalidraw-container')).toBeInTheDocument();
    expect(screen.getByTestId('mock-excalidraw-canvas')).toHaveTextContent('Excalidraw Architecture Canvas');
  });

  it('adds an architectural component when a preset button is clicked', () => {
    const changeSpy = vi.fn();
    render(<ExcalidrawCanvas onChange={changeSpy} />);

    const lbButton = screen.getByTestId('add-preset-load_balancer');
    fireEvent.click(lbButton);

    expect(changeSpy).toHaveBeenCalled();
    const lastCall = changeSpy.mock.calls[changeSpy.mock.calls.length - 1][0];
    expect(lastCall.elements).toBeDefined();
    expect(lastCall.elements.length).toBeGreaterThan(0);
  });

  it('resets the scene when clear canvas button is clicked', () => {
    const changeSpy = vi.fn();
    render(<ExcalidrawCanvas onChange={changeSpy} />);

    const clearButton = screen.getByTestId('canvas-clear-btn');
    fireEvent.click(clearButton);

    expect(changeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: []
      })
    );
  });
});
