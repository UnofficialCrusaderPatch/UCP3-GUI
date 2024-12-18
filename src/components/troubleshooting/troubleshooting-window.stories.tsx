import type { Meta, StoryObj } from '@storybook/react';

import { Troubleshooting } from './troubleshooting-window';

const meta = {
  component: Troubleshooting,
} satisfies Meta<typeof Troubleshooting>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    args: undefined,
    closeFunc: () => {},
  },
};
