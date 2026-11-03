import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App Component', () => {
    it('renders the dashboard by default', () => {
        // App is rendered inside BrowserRouter in main.jsx, so the test needs a router too
        render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
        // Expect "Mito Logo" and dashboard balances
        expect(screen.getAllByAltText(/Mito Logo/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Balances/i).length).toBeGreaterThan(0);
    });
});
