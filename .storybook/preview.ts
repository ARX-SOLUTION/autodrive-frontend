import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';

// Pull in tokens + tailwind base so stories render with app parity.
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: 'hsl(0 0% 100%)' },
        { name: 'app-dark', value: 'hsl(222 47% 11%)' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
