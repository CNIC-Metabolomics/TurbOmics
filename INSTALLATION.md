# TurbOmis/TurboPutative Installation

## Requirements

### System Requirements

* **Python 3.11**
  At the moment, we cannot upgrade further because some older packages (including certain versions of sspa) are not fully compatible with Python 3.12 yet.
* **R 4.5 or higher**
* **Node.js**
* **Git**
* **Git LFS (Large File Storage)**

## Install Git and Git LFS

### 1. Install Git

#### RHEL / CentOS / Rocky

```bash
sudo dnf install git
```

### 2. Install Git LFS

#### RHEL / CentOS / Rocky

```bash
sudo dnf install git-lfs
```

After installation, initialize Git LFS:

```bash
git lfs install
```

> Git LFS is required to correctly download large JSON and ZIP files tracked in this repository.
> Without Git LFS, large files will appear as small pointer text files.

# Clone the Repository (IMPORTANT)

Because this project uses Git LFS, follow these steps:

```bash
git clone https://github.com/CNIC-Metabolomics/TurbOmics.git
cd TurbOmics
git lfs install
git lfs pull
```

This ensures that all large files (e.g., large `.json` and `.zip` files) are properly downloaded.

You can verify LFS files with:

```bash
git lfs ls-files
```

If you see large files listed, Git LFS is working correctly.


# Install Node.js Dependencies

Install PM2 globally:

```bash
npm install -g pm2
```

Install project dependencies:

```bash
npm install
```

# Install Python Requirements

Two separate virtual environments are required because **PathwayIntegrate** depends on a dedicated set of package versions.

## 1. Environment for MOFA2 and Mummichog

Open a terminal (shell) and create the virtual environment:

```bash
python -m venv env
```

Activate it and install the required packages:

```bash
source env/bin/activate
pip install -r python_requirements.txt
```

## 2. Environment for PathwayIntegrate

Open a new terminal (shell) and create a separate virtual environment:

```bash
python -m venv env_pathwayintegrate
```

Activate it and install the required packages:

```bash
source env_pathwayintegrate/bin/activate
pip install -r python_requirements_PathIntegrate.txt
```

> Make sure to activate the appropriate environment before running each tool.

# Install R Requirements

```bash
Rscript installation-R-dependences.R
```

# Getting Started

### Start the application using the ecosystem file

```bash
pm2 start ecosystem.config.js
```

If it's already running:

```bash
pm2 restart ecosystem.config.js
```

Or reload safely:

```bash
pm2 reload ecosystem.config.js
```

### Verify the process status

```bash
pm2 show turbomics
```

### View logs

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

