import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportRates from './SupportRates';

const {
    saveMock,
    setFillColorMock,
    roundedRectMock,
    setTextColorMock,
    setFontMock,
    setFontSizeMock,
    textMock,
    autoTableMock,
    addImageMock
} = vi.hoisted(() => ({
    saveMock: vi.fn(),
    setFillColorMock: vi.fn(),
    roundedRectMock: vi.fn(),
    setTextColorMock: vi.fn(),
    setFontMock: vi.fn(),
    setFontSizeMock: vi.fn(),
    textMock: vi.fn(),
    autoTableMock: vi.fn(),
    addImageMock: vi.fn()
}));

vi.mock('jspdf', () => ({
    jsPDF: vi.fn(function MockJsPdf() {
        return {
        save: saveMock,
        setFillColor: setFillColorMock,
        roundedRect: roundedRectMock,
        setTextColor: setTextColorMock,
        setFont: setFontMock,
        setFontSize: setFontSizeMock,
        text: textMock,
        addImage: addImageMock,
        };
    })
}));

vi.mock('jspdf-autotable', () => ({
    default: autoTableMock
}));

/**
 * Click a SearchableSelect by finding its trigger (the closed dropdown display),
 * then pick an option from the opened dropdown.
 */
const openDropdownByText = (text) => {
    const el = screen.getByText(text, { selector: 'span[style*="font-weight: 600"]' });
    const trigger = el.closest('[style*="cursor: pointer"]');
    fireEvent.click(trigger);
    return trigger.closest('[style*="position: relative"]');
};

const selectOption = (triggerText, optionText) => {
    openDropdownByText(triggerText);
    // The option is inside the dropdown panel, find it specifically
    const allMatches = screen.getAllByText(optionText);
    // Pick the one inside a dropdown item (has cursor: pointer and gap: 12)
    const dropdownOption = allMatches.find(el =>
        el.closest('[style*="gap: 12px"]') || el.closest('[style*="gap: 12"]')
    ) || allMatches[allMatches.length - 1];
    fireEvent.click(dropdownOption.closest('[style*="cursor: pointer"]') || dropdownOption);
};

describe('SupportRates exports', () => {
    beforeEach(() => {
        saveMock.mockClear();
        setFillColorMock.mockClear();
        roundedRectMock.mockClear();
        setTextColorMock.mockClear();
        setFontMock.mockClear();
        setFontSizeMock.mockClear();
        textMock.mockClear();
        autoTableMock.mockClear();
        addImageMock.mockClear();
    });

    it('downloads the currently filtered rows as PDF', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('asset load not needed in test')));
        render(<SupportRates />);

        selectOption('Rhemito', 'BasketMouth');
        fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

        await waitFor(() => expect(autoTableMock).toHaveBeenCalledTimes(1));
        const options = autoTableMock.mock.calls[0][1];
        expect(options.body).toEqual([
            ['1203', 'Nigeria', 'ALL', 'NGN - USD', '1.0000 / 0.0000 (Override)', 'Active']
        ]);
        expect(saveMock).toHaveBeenCalledWith('exchange-rates-corridors.pdf');
        vi.unstubAllGlobals();
    });

    it('downloads the currently filtered rows as CSV', () => {
        const createObjectURLMock = vi.fn(() => 'blob:mock');
        const revokeObjectURLMock = vi.fn();
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        vi.stubGlobal('URL', {
            ...global.URL,
            createObjectURL: createObjectURLMock,
            revokeObjectURL: revokeObjectURLMock
        });

        render(<SupportRates />);

        selectOption('Rhemito', 'BasketMouth');
        fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

        const blob = createObjectURLMock.mock.calls[0][0];
        expect(blob).toBeInstanceOf(Blob);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock');
        clickSpy.mockRestore();
        vi.unstubAllGlobals();
    });

    it('updates the visible table when filters change', () => {
        render(<SupportRates />);

        selectOption('Rhemito', 'BasketMouth');

        const rows = screen.getAllByRole('row');
        const dataRow = rows.find((row) => within(row).queryByText('1203'));
        expect(dataRow).toBeTruthy();
        expect(screen.queryByText('1246')).not.toBeInTheDocument();
    });

    it('filters corridors by send country', () => {
        render(<SupportRates />);

        // Clear affiliate filter first
        selectOption('Rhemito', 'All Affiliates');
        // Select United Kingdom from country dropdown
        selectOption('All Countries', 'United Kingdom');

        expect(screen.getByText('2309')).toBeInTheDocument();
        expect(screen.queryByText('1246')).not.toBeInTheDocument();
    });
});

describe('SupportRates premium dropdown features', () => {
    it('shows country flags and currency info in the country dropdown', () => {
        render(<SupportRates />);

        const container = openDropdownByText('All Countries');

        // Verify dropdown shows country with flag, ISO code badge, and currency symbol subtitle
        const dropdown = container.querySelector('[style*="max-height"]');
        expect(dropdown).toBeTruthy();

        expect(within(dropdown).getByText('GBP')).toBeInTheDocument();
        expect(within(dropdown).getByText('British Pound (£)')).toBeInTheDocument();

        expect(within(dropdown).getByText('INR')).toBeInTheDocument();
        expect(within(dropdown).getByText('Indian Rupee (₹)')).toBeInTheDocument();

        expect(within(dropdown).getByText('NGN')).toBeInTheDocument();
        expect(within(dropdown).getByText('Nigerian Naira (₦)')).toBeInTheDocument();
    });

    it('shows currency flags, ISO codes and symbols in From Currency dropdown', () => {
        render(<SupportRates />);

        const container = openDropdownByText('All From Currency');
        const dropdown = container.querySelector('[style*="max-height"]');

        expect(within(dropdown).getByText('Euro')).toBeInTheDocument();
        expect(within(dropdown).getByText('EUR')).toBeInTheDocument();
        expect(within(dropdown).getByText('€')).toBeInTheDocument();

        expect(within(dropdown).getByText('British Pound')).toBeInTheDocument();
        expect(within(dropdown).getByText('GBP')).toBeInTheDocument();
        expect(within(dropdown).getByText('£')).toBeInTheDocument();
    });

    it('shows currency flags, ISO codes and symbols in To Currency dropdown', () => {
        render(<SupportRates />);

        const container = openDropdownByText('All To Currency');
        const dropdown = container.querySelector('[style*="max-height"]');

        expect(within(dropdown).getByText('Singapore Dollar')).toBeInTheDocument();
        expect(within(dropdown).getByText('SGD')).toBeInTheDocument();
        expect(within(dropdown).getByText('S$')).toBeInTheDocument();

        expect(within(dropdown).getByText('Kenyan Shilling')).toBeInTheDocument();
        expect(within(dropdown).getByText('KES')).toBeInTheDocument();
        expect(within(dropdown).getByText('KSh')).toBeInTheDocument();
    });

    it('filters dropdown options via search input', () => {
        render(<SupportRates />);

        openDropdownByText('All Countries');
        const searchInput = screen.getByPlaceholderText('Type to search...');
        fireEvent.change(searchInput, { target: { value: 'Kenya' } });

        expect(screen.getByText('Kenya')).toBeInTheDocument();
        expect(screen.getByText('Kenyan Shilling (KSh)')).toBeInTheDocument();
        // Other countries should be filtered out
        expect(screen.queryByText('British Pound (£)')).not.toBeInTheDocument();
        expect(screen.queryByText('Indian Rupee (₹)')).not.toBeInTheDocument();
    });

    it('searches by currency code in country dropdown', () => {
        render(<SupportRates />);

        openDropdownByText('All Countries');
        const searchInput = screen.getByPlaceholderText('Type to search...');
        fireEvent.change(searchInput, { target: { value: 'GBP' } });

        expect(screen.getByText('British Pound (£)')).toBeInTheDocument();
        expect(screen.queryByText('Indian Rupee (₹)')).not.toBeInTheDocument();
    });

    it('searches by currency symbol text in country dropdown', () => {
        render(<SupportRates />);

        openDropdownByText('All Countries');
        const searchInput = screen.getByPlaceholderText('Type to search...');
        fireEvent.change(searchInput, { target: { value: 'Rupee' } });

        expect(screen.getByText('Indian Rupee (₹)')).toBeInTheDocument();
        expect(screen.queryByText('British Pound (£)')).not.toBeInTheDocument();
    });

    it('shows "No results found" when search has no matches', () => {
        render(<SupportRates />);

        openDropdownByText('All Countries');
        const searchInput = screen.getByPlaceholderText('Type to search...');
        fireEvent.change(searchInput, { target: { value: 'zzzzzzz' } });

        expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('highlights selected option with checkmark', () => {
        render(<SupportRates />);

        const container = openDropdownByText('All Countries');
        const dropdown = container.querySelector('[style*="max-height"]');

        // The selected "All Countries" option should have the checkmark
        const checkmark = within(dropdown).getByText('✓');
        expect(checkmark).toBeInTheDocument();

        // The selected item should have a gradient background
        const selectedItem = checkmark.closest('[style*="linear-gradient"]');
        expect(selectedItem).toBeTruthy();
    });
});
