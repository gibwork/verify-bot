import '@testing-library/jest-dom';

// Mock the Buffer for the browser environment
global.Buffer = require('buffer').Buffer; 