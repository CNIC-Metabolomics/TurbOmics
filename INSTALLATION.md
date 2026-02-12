# TurbOmis/TurboPutative Installation

## Requeriments 

+ Python 3.12 or higher
+ R 4.5 or higher
+ Node.js
+ Install PM2 globally:
```bash
npm install -g pm2
```

## Install ModeJs dependencies

```bash
npm install
```

## Install Python requirements

```bash
pip install -r python_requirements.txt
```

## Install R requirements

```bash
Rscript installation-R-dependences.R
```


# Getting Started

+ Start the application using the ecosystem file
```bash
pm2 start ecosystem.config.js
```

If it's already running:
```bash
pm2 restart ecosystem.config.js
```
or reload safely:
```bash
pm2 reload ecosystem.config.js
``` 

+ Verify the flags are applied
```bash
pm2 show turbomics
```

+ Where to see the traces
```bash
pm2 logs turbomics
```
or directly:
```bash
tail -f ./logs/error.log
```


# File Structure Description

The `src` directory contains all the files and source code used by the web application:

* **src/index.js**
  The main entry point of the web application. This file starts the server and listens for incoming connections.

* **src/routes/**
  Contains an `index.js` file that defines and manages the different server routes.

* **src/views/**
  Contains the HTML templates corresponding to the different sections of the web application.

* **src/public/**
  Contains the server’s static assets (e.g., CSS, JavaScript, images).

* **src/partial/**
  Contains reusable HTML partials that are shared across multiple views.

* **src/lib/**
  Contains various JavaScript utility functions used by the server.

* **src/TurboPutative-X.X-built/**
  Contains the code required to execute the TurboPutative workflow.

* **src/TurboOmicsIntegrator/**
  Contains the TurbOmis frontend code.

