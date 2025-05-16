# Vue.js Story Generator Application

A modern Vue.js 3 application built with Vite, featuring story generation capabilities and image processing functionality.

## Features

- Story generation interface
- Modern UI with FontAwesome icons
- Image background removal using ONNX Runtime
- JSON visualization with vue-json-pretty
- Toast notifications for better user experience
- Routing with Vue Router

## Project Structure

```
├── src/                    # Source code
│   ├── assets/            # Static assets
│   ├── components/        # Vue components
│   ├── router/           # Vue Router configuration
│   ├── App.vue           # Root Vue component
│   ├── main.js           # Application entry point
│   ├── Start.vue         # Start page component
│   ├── Continue.vue      # Continue page component
│   └── Storygenerator.vue # Story generation component
├── public/                # Public static assets
├── dist/                  # Production build output
└── electron/              # Electron app configuration
```

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

## Development Setup

1. Clone the repository:
   ```sh
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```sh
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```sh
   npm run dev
   # or
   yarn dev
   ```

4. Preview production build:
   ```sh
   npm run preview
   # or
   yarn preview
   ```

## Building for Production

Build the application for production:
```sh
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Deployment

The project can be deployed using the following command:
```sh
npm run deploy
# or
yarn deploy
```

This will deploy the application to GitHub Pages.

## Dependencies

### Main Dependencies
- Vue.js 3 - Progressive JavaScript framework
- Vue Router - Official router for Vue.js
- FontAwesome - Icon library
- ONNX Runtime Web - Machine learning inference
- Vue Toastification - Toast notifications
- Vue JSON Pretty - JSON visualization

### Development Dependencies
- Vite - Next generation frontend tooling
- VitePress - Static site generator
- Vue DevTools - Development tools for Vue

## IDE Setup

For the best development experience, we recommend:
- [VSCode](https://code.visualstudio.com/)
- [Volar Extension](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- Disable Vetur if installed

## Configuration

The project uses Vite as its build tool. You can customize the configuration in:
- `vite.config.js` - Vite configuration
- `jsconfig.json` - JavaScript configuration
- `vercel.json` - Vercel deployment configuration

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
