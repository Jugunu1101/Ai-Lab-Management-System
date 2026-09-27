import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AtRiskStudentsTable from './AtRiskStudentsTable';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AtRiskStudentsTable - Privacy & ID Masking', () => {
  const mockStudents = [
    {
      _id: '6ab274fbaab625a8b2666ca2',
      studentId: '6ab274fbaab625a8b2666ca2',
      name: 'DemoStudent',
      email: 'demo@mit.edu',
      score: 38,
      weakTopics: ['Recursion', 'Dynamic Programming'],
      reason: 'Mastery score below 45% threshold',
    },
  ];

  it('renders student name, email, mastery score, vulnerable topics, and action button', () => {
    render(
      <BrowserRouter>
        <AtRiskStudentsTable students={mockStudents} />
      </BrowserRouter>
    );

    expect(screen.getAllByText('DemoStudent').length).toBeGreaterThan(0);
    expect(screen.getAllByText('demo@mit.edu').length).toBeGreaterThan(0);
    expect(screen.getAllByText('38%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recursion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dynamic Programming').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Below 45% threshold').length).toBeGreaterThan(0);
  });

  it('strictly ensures database ObjectId is NOT rendered in visible UI', () => {
    const { container } = render(
      <BrowserRouter>
        <AtRiskStudentsTable students={mockStudents} />
      </BrowserRouter>
    );

    expect(screen.queryByText(/6ab274fbaab625a8b2666ca2/i)).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('6ab274fbaab625a8b2666ca2');
    expect(container.textContent).not.toContain('ID:');
  });

  it('preserves internal student ID for View navigation', () => {
    render(
      <BrowserRouter>
        <AtRiskStudentsTable students={mockStudents} />
      </BrowserRouter>
    );

    const viewButtons = screen.getAllByRole('button', { name: /View/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/teacher/students/6ab274fbaab625a8b2666ca2');
  });
});
