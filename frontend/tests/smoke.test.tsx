import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { usePathname } from 'next/navigation';
import { nav } from './mocks/navigation';

function Probe() {
  return (
    <main>
      <h1>Path {usePathname()}</h1>
    </main>
  );
}

describe('test tooling', () => {
  it('renders with the navigation mock and passes axe', async () => {
    nav.pathname = '/assets';
    const { container } = render(<Probe />);
    expect(screen.getByRole('heading')).toHaveTextContent('Path /assets');
    expect(await axe(container)).toHaveNoViolations();
  });
});
