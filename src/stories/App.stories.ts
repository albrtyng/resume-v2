import App from '../App';
import '../index.css';
import type { Meta, StoryObj } from '@storybook/react';

// Define the meta configuration
const meta: Meta<typeof App> = {
    title: 'Pages/App', // Updated title with category
    component: App,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof App>;

export const Default: Story = {
    args: {},
};
