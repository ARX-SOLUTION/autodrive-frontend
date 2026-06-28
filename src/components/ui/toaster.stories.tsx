import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';

import { Button } from './button';
import { Toaster } from './sonner';

const meta: Meta = {
  title: 'UI/Toaster',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Success: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast.success('Saved', { description: 'Student record updated.' })
      }
    >
      Show success
    </Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button
      variant="destructive"
      onClick={() =>
        toast.error('Failed to save', {
          description: 'Network request timed out.',
        })
      }
    >
      Show error
    </Button>
  ),
};

export const Info: Story = {
  render: () => (
    <Button
      variant="outline"
      onClick={() =>
        toast('New payment recorded', { description: '250 000 UZS' })
      }
    >
      Show info
    </Button>
  ),
};
