import { Hero } from '../../components/Hero';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Hero> = {
    title: 'Components/Hero',
    component: Hero,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Default: Story = {};
