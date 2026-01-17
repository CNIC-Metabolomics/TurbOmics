module.exports = {
  apps: [
    {
      name: "turbomics",
      script: "src/index.js",

      // Stack traces
      node_args: "--enable-source-maps --trace-warnings",

      // Optional but recommended
      instances: 1,
      autorestart: true,
      watch: false,

      // Log files
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",

      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
