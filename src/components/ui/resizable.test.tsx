import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable';

describe('Resizable wrapper', () => {
  it('keeps the legacy direction API and forwards handle attributes', () => {
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(500);
    const { container } = render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={25}>Top</ResizablePanel>
        <ResizableHandle aria-label="Resize panels" withHandle />
        <ResizablePanel defaultSize={75}>Bottom</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const group = container.querySelector<HTMLElement>('[data-group]');
    if (!group) {
      throw new Error('Expected resizable panel group to render');
    }
    const panels = group.querySelectorAll('[data-panel]');

    expect(group).toHaveStyle({
      flexDirection: 'column',
    });
    expect(panels[0]).toHaveStyle({ flexGrow: '25' });
    expect(panels[1]).toHaveStyle({ flexGrow: '75' });
    expect(
      screen.getByRole('separator', { name: 'Resize panels' }),
    ).toBeInTheDocument();

    offsetHeight.mockRestore();
  });
});
