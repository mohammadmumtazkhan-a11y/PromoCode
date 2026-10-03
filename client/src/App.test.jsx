import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App Component', () => {
    it('renders the dashboard by default', () => {
        // App is rendered inside BrowserRouter in main.jsx, so the test needs a router too
        render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
        // Expect "Mito Admin" from sidebar or "Welcome back" from header
        expect(screen.getByText(/Mito Admin/i)).toBeInTheDocument();
        expect(screen.getByText(/Account Overview/i)).toBeInTheDocument();
    });
});
