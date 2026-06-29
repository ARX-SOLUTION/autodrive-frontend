import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">
          A minimal card with body content only.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Group A-12</CardTitle>
        <CardDescription>Theory · Mon, Wed, Fri</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">22 students enrolled. Course ends in 14 days.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Dismiss</Button>
        <Button>View group</Button>
      </CardFooter>
    </Card>
  ),
};
