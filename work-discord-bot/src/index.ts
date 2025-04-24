import { setupBot } from './bot';
import { setupAPI } from './api';

setupBot()
  .then(() => {
    console.log('Discord bot connected successfully');
    setupAPI();
})
  .catch((error) => {
    console.error('Failed to start services:', error);
    process.exit(1);
});