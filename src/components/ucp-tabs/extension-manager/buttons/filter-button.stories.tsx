import type { Meta, StoryObj } from '@storybook/react';

import { FilterButton } from './filter-button';

const meta = {
  component: FilterButton,
} satisfies Meta<typeof FilterButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
