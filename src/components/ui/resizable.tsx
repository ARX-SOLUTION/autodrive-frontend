/* eslint-disable react-refresh/only-export-components */

import { DotsSixVertical } from '@phosphor-icons/react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@/lib/utils';

type ResizablePanelGroupProps = Omit<
  React.ComponentProps<typeof ResizablePrimitive.Group>,
  'orientation'
> & {
  direction: NonNullable<
    React.ComponentProps<typeof ResizablePrimitive.Group>['orientation']
  >;
};

const ResizablePanelGroup = ({
  className,
  direction,
  ...props
}: ResizablePanelGroupProps) => (
  <ResizablePrimitive.Group
    className={cn(
      'flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
      className,
    )}
    data-panel-group-direction={direction}
    orientation={direction}
    {...props}
  />
);

type ResizablePanelProps = React.ComponentProps<
  typeof ResizablePrimitive.Panel
>;

const asPercentage = (size: number | string | undefined) =>
  typeof size === 'number' ? `${size}%` : size;

const ResizablePanel = ({
  collapsedSize,
  defaultSize,
  maxSize,
  minSize,
  ...props
}: ResizablePanelProps) => (
  <ResizablePrimitive.Panel
    collapsedSize={asPercentage(collapsedSize)}
    defaultSize={asPercentage(defaultSize)}
    maxSize={asPercentage(maxSize)}
    minSize={asPercentage(minSize)}
    {...props}
  />
);

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[aria-orientation=horizontal]>div]:rotate-90',
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <DotsSixVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
