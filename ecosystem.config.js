module.exports = {
  apps: [
    {
      name: "affiliate-hub-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
    {
      name: "affiliate-hub-workers",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "workers/index.ts",
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      env: { NODE_ENV: "production" },
    },
  ],
};
