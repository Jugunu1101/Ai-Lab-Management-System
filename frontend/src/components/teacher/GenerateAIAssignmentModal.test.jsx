import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GenerateAIAssignmentModal from './GenerateAIAssignmentModal';
import assignmentService from '../../services/assignment.service';
import classService from '../../services/class.service';

vi.mock('../../services/assignment.service', () => ({
  default: {
    generateAIAssignment: vi.fn(),
    createAssignment: vi.fn(),
  },
}));

vi.mock('../../services/class.service', () => ({
  default: {
    getClasses: vi.fn().mockResolvedValue({
      data: [{ _id: 'class-1', name: 'CS101 Intro', code: 'CS101' }],
    }),
  },
}));

describe('GenerateAIAssignmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with topic, language, and difficulty form fields', async () => {
    render(
      <GenerateAIAssignmentModal open={true} onClose={() => {}} onSuccess={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText('AI Coding Assignment Generator')).toBeInTheDocument();
      expect(screen.getByText('Target Classroom')).toBeInTheDocument();
      expect(screen.getByText('Algorithmic / Core Topic')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Assignment/i })).toBeInTheDocument();
    });
  });

  it('switches to preview step when AI assignment is generated', async () => {
    assignmentService.generateAIAssignment.mockResolvedValueOnce({
      data: {
        title: 'Recursive Factorial',
        description: 'Calculate factorial recursively',
        problemStatement: 'Given non-negative integer N, compute N!',
        language: 'python',
        difficulty: 'EASY',
        topics: ['recursion'],
        testCases: [
          { input: '5', expectedOutput: '120', isHidden: false },
          { input: '0', expectedOutput: '1', isHidden: true },
        ],
        starterCode: 'def solve():\n    pass',
        hints: ['Base case is N <= 1'],
        explanation: 'Multiplies down to 1',
      },
    });

    render(
      <GenerateAIAssignmentModal open={true} onClose={() => {}} onSuccess={() => {}} />
    );

    await waitFor(() => {
      expect(screen.getByText('AI Coding Assignment Generator')).toBeInTheDocument();
    });

    // Wait for classes to be loaded into state
    await waitFor(() => {
      expect(classService.getClasses).toHaveBeenCalled();
    });

    const generateBtn = screen.getByRole('button', { name: /Generate Assignment/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Preview AI-Generated Assignment')).toBeInTheDocument();
      expect(screen.getByText('Recursive Factorial')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Assign to Class/i })).toBeInTheDocument();
    });
  });

  it('passes current title in exclusion list when Regenerate is clicked and updates preview', async () => {
    assignmentService.generateAIAssignment
      .mockResolvedValueOnce({
        data: {
          title: 'Sum of Even Numbers',
          description: 'Sum evens',
          problemStatement: 'Sum all even integers up to N',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '4', expectedOutput: '6', isHidden: false }],
          starterCode: '#include <iostream>',
        },
      })
      .mockResolvedValueOnce({
        data: {
          title: 'Count Divisible Numbers in Range',
          description: 'Count divisibles',
          problemStatement: 'Count integers divisible by K up to N',
          language: 'cpp',
          difficulty: 'EASY',
          topics: ['loops'],
          testCases: [{ input: '15 3', expectedOutput: '5', isHidden: false }],
          starterCode: '#include <iostream>',
        },
      });

    render(
      <GenerateAIAssignmentModal open={true} onClose={() => {}} onSuccess={() => {}} />
    );

    await waitFor(() => {
      expect(classService.getClasses).toHaveBeenCalled();
    });

    const generateBtn = screen.getByRole('button', { name: /Generate Assignment/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Sum of Even Numbers')).toBeInTheDocument();
    });

    // Click Regenerate
    const regenBtn = screen.getByRole('button', { name: /Regenerate/i });
    fireEvent.click(regenBtn);

    await waitFor(() => {
      expect(assignmentService.generateAIAssignment).toHaveBeenCalledTimes(2);
      expect(assignmentService.generateAIAssignment).toHaveBeenLastCalledWith(
        expect.objectContaining({
          classId: 'class-1',
          excludedTitles: expect.arrayContaining(['Sum of Even Numbers']),
          currentTitle: 'Sum of Even Numbers',
        })
      );
      expect(screen.getByText('Count Divisible Numbers in Range')).toBeInTheDocument();
    });
  });
});
