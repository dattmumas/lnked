import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { usePostEditorStore } from '@/lib/stores/post-editor-v2-store';
import RichTextEditor from '@/components/editor/RichTextEditor';

// Mock the lowlight module
jest.mock('lowlight', () => ({
  createLowlight: () => ({
    highlight: jest.fn(),
    highlightAuto: jest.fn(),
    listLanguages: jest.fn(() => []),
  }),
}));

// Mock tippy.js
jest.mock('tippy.js', () => ({
  __esModule: true,
  default: jest.fn(() => [
    {
      show: jest.fn(),
      destroy: jest.fn(),
    },
  ]),
}));

// Mock Y.js and WebSocket provider
jest.mock('yjs', () => ({
  Doc: jest.fn(() => ({})),
}));

jest.mock('y-websocket', () => ({
  WebsocketProvider: jest.fn(() => ({
    destroy: jest.fn(),
  })),
}));

describe('RichTextEditor', () => {
  // Helper to reset store between tests
  beforeEach(() => {
    usePostEditorStore.getState().clearForm();
  });

  it('loads initial content for editing', async () => {
    // Seed the store with existing post content
    usePostEditorStore.getState().initializeForm({
      title: 'Test',
      content: '<p>Hello <strong>world</strong></p>',
      post_type: 'text',
      metadata: {},
      is_public: false,
      status: 'draft',
      selected_collectives: [],
    });
    render(<RichTextEditor />);
    // The initial content should appear in the editor
    const editorArea = screen.getByLabelText(/post content/i);
    expect(editorArea.innerHTML).toContain('Hello');
    expect(editorArea.innerHTML).toContain('<strong>world</strong>'); // world should render bold
  });

  it('updates store content on user input', async () => {
    render(<RichTextEditor />);
    const editorArea = screen.getByLabelText(/post content/i);
    await userEvent.click(editorArea);
    await userEvent.keyboard('Hello TipTap');
    // Simulate letting the throttle flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    const content = usePostEditorStore.getState().formData.content;
    expect(content).toContain('Hello TipTap');
    expect(content).toMatch(/<p>.*Hello TipTap.*<\/p>/);
  });

  it('supports basic formatting via toolbar', async () => {
    render(<RichTextEditor />);
    const boldButton = screen.getByTitle('Bold');
    const editorArea = screen.getByLabelText(/post content/i);

    // Type some text
    await userEvent.click(editorArea);
    await userEvent.keyboard('Test text');

    // Select all text (Ctrl+A)
    await userEvent.keyboard('{Control>}a{/Control}');

    // Click bold button
    await userEvent.click(boldButton);

    // Let the update propagate
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });

    const content = usePostEditorStore.getState().formData.content;
    expect(content).toContain('<strong>Test text</strong>');
  });
});
