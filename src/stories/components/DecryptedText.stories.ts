import { DecryptedText } from '../../components/DecryptedText';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof DecryptedText> = {
    title: 'Components/DecryptedText',
    component: DecryptedText,
    parameters: {
        layout: 'fullscreen',
    },
};

export default meta;
type Story = StoryObj<typeof DecryptedText>;

export const Default: Story = {
    args: {
        text: 'This is a longer piece of text to demonstrate the decryption animation with multiple words.',
    },
};
