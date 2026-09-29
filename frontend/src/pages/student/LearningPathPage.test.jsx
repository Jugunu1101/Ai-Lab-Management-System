import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LearningPathPage from './LearningPathPage';
import progressService from '../../services/progress.service';

vi.mock('../../services/progress.service', () => ({
  default: {
    getStudentLearningPath: vi.fn(),
    getStudentDashboard: vi.fn(),
  },
}));

describe('LearningPathPage Roadmap & Status Reconciliation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders completed topic state cleanly and ensures a completed topic is never Locked', async () => {
    progressService.getStudentLearningPath.mockResolvedValueOnce({
      data: {
        steps: [
          { step: 1, topic: 'basics', status: 'COMPLETED', masteryScore: 100 },
          { step: 2, topic: 'loops', status: 'IN_PROGRESS', masteryScore: 28 },
          { step: 3, topic: 'arrays', status: 'PENDING', masteryScore: 0 },
        ],
        targetFocus: ['loops'],
        summary: 'Roadmap for Python',
      },
    });

    progressService.getStudentDashboard.mockResolvedValueOnce({
      data: {
        overallMastery: 33,
        averageScore: 33,
      },
    });

    render(
      <MemoryRouter>
        <LearningPathPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Personalized AI Learning Path')).toBeInTheDocument();
    });

    // Check overall mastery percentage
    expect(screen.getByText('33%')).toBeInTheDocument();

    // Check step 1 (basics - COMPLETED)
    expect(screen.getByText('1. basics')).toBeInTheDocument();
    expect(screen.getByText('Completed (100%)')).toBeInTheDocument();

    // Check step 2 (loops - Current Step)
    expect(screen.getByText('2. loops')).toBeInTheDocument();
    expect(screen.getByText('Current Step')).toBeInTheDocument();

    // Check step 3 (arrays - Available)
    expect(screen.getByText('3. arrays')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders a completed topic placed at a later index as Completed and never Locked', async () => {
    progressService.getStudentLearningPath.mockResolvedValueOnce({
      data: {
        steps: [
          { step: 1, topic: 'syntax', status: 'IN_PROGRESS', masteryScore: 40 },
          { step: 2, topic: 'variables', status: 'PENDING', masteryScore: 0 },
          { step: 3, topic: 'recursion', status: 'COMPLETED', masteryScore: 90 },
        ],
        targetFocus: ['syntax'],
        summary: 'Roadmap with advanced mastery',
      },
    });

    progressService.getStudentDashboard.mockResolvedValueOnce({
      data: {
        overallMastery: 43,
        averageScore: 43,
      },
    });

    render(
      <MemoryRouter>
        <LearningPathPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3. recursion')).toBeInTheDocument();
    });

    // Ensure recursion (index 2) is rendered as Completed (90%), NOT Locked
    expect(screen.getByText('Completed (90%)')).toBeInTheDocument();
    expect(screen.queryByText('3. recursion').closest('div')).not.toHaveTextContent('Locked');
  });
});
