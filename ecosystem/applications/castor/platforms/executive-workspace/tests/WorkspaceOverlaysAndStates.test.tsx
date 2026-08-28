import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkspaceDrawer from '../src/components/shell/WorkspaceDrawer';
import WorkspaceModal from '../src/components/shell/WorkspaceModal';
import WorkspaceEmptyState from '../src/components/shell/WorkspaceEmptyState';
import WorkspaceErrorState from '../src/components/shell/WorkspaceErrorState';

describe('WorkspaceDrawer', () => {
  it('renders nothing when closed', () => {
    render(
      <WorkspaceDrawer isOpen={false} onClose={() => {}} title="Test Drawer">
        <p>Drawer content</p>
      </WorkspaceDrawer>
    );
    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
  });

  it('renders content and calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <WorkspaceDrawer isOpen={true} onClose={onClose} title="Test Drawer">
        <p>Drawer content</p>
      </WorkspaceDrawer>
    );
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceModal', () => {
  it('renders nothing when closed', () => {
    render(
      <WorkspaceModal isOpen={false} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </WorkspaceModal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders content and calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <WorkspaceModal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </WorkspaceModal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceEmptyState', () => {
  it('renders title and description', () => {
    render(
      <WorkspaceEmptyState
        title="No data yet"
        description="Nothing has been added."
      />
    );
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing has been added.')).toBeInTheDocument();
  });

  it('calls onAction when the action button is clicked', () => {
    const onAction = vi.fn();
    render(
      <WorkspaceEmptyState
        title="No data yet"
        actionLabel="Add item"
        onAction={onAction}
      />
    );
    fireEvent.click(screen.getByText('Add item'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('WorkspaceErrorState', () => {
  it('renders the default title when none is provided', () => {
    render(<WorkspaceErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onRetry when Try again is clicked', () => {
    const onRetry = vi.fn();
    render(<WorkspaceErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});