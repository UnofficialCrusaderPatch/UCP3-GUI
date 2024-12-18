import type { Meta, StoryObj } from '@storybook/react';

import LanguageSelect from './language-select';

const meta = {
  component: LanguageSelect,
} satisfies Meta<typeof LanguageSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
