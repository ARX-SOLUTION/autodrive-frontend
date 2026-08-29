import { useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from '@/app/AppProviders';
import { createAppRouter } from '@/app/router';

const App = () => {
  // Construct at render time so browser and test histories start from the
  // current URL instead of a stale module-evaluation snapshot.
  const [router] = useState(createAppRouter);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
};

export default App;
