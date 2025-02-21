import type { Meta, StoryObj } from '@storybook/react';
import { Aurora } from '../../components/Aurora';

const meta: Meta<typeof Aurora> = {
  title: 'Components/Aurora',
  component: Aurora,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Aurora>;

export const Default: Story = {
  args: {
    colorStops: ['#ca9ee6', '#303446', '#ca9ee6'],
    className: 'w-screen h-screen',
  },
};
