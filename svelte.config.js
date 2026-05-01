import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    paths: {
      base: 'POMO_BASE' in process.env ? process.env.POMO_BASE : '/pomotask',
    },
    alias: {
      $lib: 'src/lib',
      $server: 'src/lib/server',
    },
  },
};

export default config;
