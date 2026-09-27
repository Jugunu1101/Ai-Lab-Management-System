import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentProgressView from './StudentProgressView';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('StudentProgressView - Privacy & ID Masking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student name, at-risk badge, email and department without exposing database ObjectId', async () => {
    const studentId = '6ab274fbaab625a8b2666ca2';

    api.get.mockImplementation((url) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          data: {
            _id: studentId,
            name: 'DemoStudent',
            email: 'demo@mit.edu',
            collegeId: '6ab274fbaab625a8b2666ca2', // internal database reference
            department: 'Computer Science',
            role: 'STUDENT',
          },
        });
      }
      return Promise.resolve({
        data: {
          averageMasteryScore: 38,
          allTopics: [
            { topic: 'Recursion', masteryScore: 35 },
            { topic: 'Dynamic Programming', masteryScore: 40 },
          ],
        },
      });
    });

    render(
      <MemoryRouter initialEntries={[`/teacher/students/${studentId}`]}>
        <Routes>
          <Route path="/teacher/students/:id" element={<StudentProgressView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DemoStudent')).toBeInTheDocument();
      expect(screen.getByText(/AT RISK/i)).toBeInTheDocument();
      // Should show email and department
      expect(screen.getByText('demo@mit.edu • Computer Science')).toBeInTheDocument();
    });

    // Strictly ensure database ObjectId and "ID:" label are NOT visible
    expect(screen.queryByText(/6ab274fbaab625a8b2666ca2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ID:/i)).not.toBeInTheDocument();
  });
});
