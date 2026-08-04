import { createApp } from './app';
import { config } from './config/env';
import { activeProviderSource } from './services/ai';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] Listening on http://localhost:${config.port}`);
  console.log(`[server] AI provider: ${activeProviderSource}`);
  console.log(`[server] Allowed origin: ${config.corsOrigin}`);
});
