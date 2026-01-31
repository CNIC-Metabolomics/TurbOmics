# TurbOmis/TurboPutative Installation

## Getting Started

1. **Install the dependencies**

```bash
npm install
```

2. **Start the server**

```bash
npm run start
```

3. **Open the web application**

Open [http://localhost:8080/TurboPutative](http://localhost:8080/TurboPutative) in your browser to access the web application.


## File Structure Description

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



# Python requirements

Python 3.10.X or higher

Install python packages:
```bash
pip install -r python_requirements.txt
```
 1476  pip install pathintegrate
 1478  pip install seaborn
pip install sspa
pip install tqdm
