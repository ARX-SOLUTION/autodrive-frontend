import type { Meta, StoryObj } from '@storybook/react';

import { Input } from './input';
import { Label } from './label';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { placeholder: 'Enter text…' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: (args) => (
    <div className="w-[280px]">
      <Input {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Disabled' },
  render: (args) => (
    <div className="w-[280px]">
      <Input {...args} />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-[280px] gap-1.5">
      <Label htmlFor="phone">Phone</Label>
      <Input id="phone" type="tel" placeholder="+998 90 000 00 00" />
    </div>
  ),
};
