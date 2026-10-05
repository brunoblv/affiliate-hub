// PM2: `npm run build` e depois `npm run pm2:start`. Os binários rodam via node direto
// (e não `npm run`) para funcionar igual no Windows e no Linux.
module.exports = {
  apps: [
    {
      name: "affiliate-hub-web",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: 3000 },
      max_memory_restart: "1G",
      time: true,
    },
    {
      // Um único worker: a fila tem lease, mas o ciclo diário não foi feito para instâncias paralelas.
      name: "affiliate-hub-worker",
      cwd: __dirname,
      script: "scripts/worker.ts",
      exec_mode: "fork",
      interpreter: "node",
      interpreter_args: "--import tsx",
      env: { NODE_ENV: "production" },
      kill_timeout: 30000,
      shutdown_with_message: true,
      restart_delay: 5000,
      time: true,
    },
  ],
};
