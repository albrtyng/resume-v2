import type { Meta, StoryObj } from '@storybook/react';
import DecryptedText from '../../components/DecryptedText/DecryptedText';

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
