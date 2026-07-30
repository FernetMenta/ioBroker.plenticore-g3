import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'build',
        emptyOutDir: true,
        chunkSizeWarningLimit: 1200,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
                        return 'vendor-react';
                    }
                    if (id.includes('node_modules/@mui/icons-material')) {
                        return 'vendor-mui-icons';
                    }
                    if (id.includes('node_modules/@mui/x-data-grid')) {
                        return 'vendor-mui-datagrid';
                    }
                    if (id.includes('node_modules/@mui/')) {
                        return 'vendor-mui';
                    }
                    if (id.includes('node_modules/@emotion/')) {
                        return 'vendor-emotion';
                    }
                    if (id.includes('node_modules/@iobroker/gui-components')) {
                        return 'vendor-gui-components';
                    }
                    if (id.includes('node_modules/@iobroker/')) {
                        return 'vendor-iobroker';
                    }
                },
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
});
