import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JoinClassPage from './JoinClassPage';
import classService from '../../services/class.service';

vi.mock('../../services/class.service', () => ({
  default: {
    joinClassByCode: vi.fn(),
  },
}));

describe('JoinClassPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders classroom join form with code input', () => {
    render(
      <MemoryRouter>
        <JoinClassPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Join a Classroom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., K9F2Q8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Classroom/i })).toBeInTheDocument();
  });

  it('submits code and displays success state upon successful join', async () => {
    classService.joinClassByCode.mockResolvedValueOnce({
      data: {
        _id: 'class-123',
        name: 'Computer Networks',
        teacherId: { name: 'Prof. Davis', email: 'davis@uni.edu' },
      },
    });

    render(
      <MemoryRouter>
        <JoinClassPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g., K9F2Q8');
    fireEvent.change(input, { target: { value: 'NET101' } });

    const submitBtn = screen.getByRole('button', { name: /Join Classroom/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Successfully Enrolled!')).toBeInTheDocument();
      expect(screen.getByText('Computer Networks')).toBeInTheDocument();
      expect(screen.getByText(/Prof. Davis/)).toBeInTheDocument();
    });
  });

  it('displays error message when joining fails', async () => {
    classService.joinClassByCode.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Invalid class code or class not found',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <JoinClassPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g., K9F2Q8');
    fireEvent.change(input, { target: { value: 'WRONG1' } });

    const submitBtn = screen.getByRole('button', { name: /Join Classroom/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid class code or class not found')).toBeInTheDocument();
    });
  });
});
