import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';
import * as AuthContext from '../../context/AuthContext';

describe('Sidebar Component', () => {
  it('renders student navigation items when user role is STUDENT', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      role: 'STUDENT',
      user: { name: 'Student User' },
    });

    render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Classes')).toBeInTheDocument();
    expect(screen.getByText('Daily AI Quiz')).toBeInTheDocument();
  });

  it('renders teacher navigation items when user role is TEACHER', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      role: 'TEACHER',
      user: { name: 'Teacher User' },
    });

    render(
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        <Sidebar collapsed={false} />
      </MemoryRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Class Analytics')).toBeInTheDocument();
    expect(screen.getByText('Weekly AI Reports')).toBeInTheDocument();
  });
});
