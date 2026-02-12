# -------------------------------
# R Package Installer with Checks
# -------------------------------

# Helper function to install CRAN packages if missing
install_cran <- function(pkg, url = NULL) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat(sprintf("** Installing CRAN package: %s\n", pkg))
    tryCatch({
      if (is.null(url)) {
        install.packages(pkg, repos = "https://cloud.r-project.org")
      } else {
        install.packages(url, repos = NULL)
      }
    }, error = function(e) {
      cat(sprintf("!! Failed to install %s: %s\n", pkg, e$message))
    })
  } else {
    cat(sprintf("** Package %s is already installed\n", pkg))
  }
}

# Helper function to install Bioconductor packages if missing
install_bioc <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat(sprintf("** Installing Bioconductor package: %s\n", pkg))
    tryCatch({
      BiocManager::install(pkg, update = FALSE)
    }, error = function(e) {
      cat(sprintf("!! Failed to install %s: %s\n", pkg, e$message))
    })
  } else {
    cat(sprintf("** Package %s is already installed\n", pkg))
  }
}

# -------------------------------
# Start Installation
# -------------------------------

cat("** Ensure BiocManager is installed\n")
install_cran("BiocManager")

cat("** Install CRAN packages\n")
install_cran("jsonlite")
install_cran("lattice", "https://cloud.r-project.org/src/contrib/lattice_0.22-6.tar.gz")
install_cran("MASS", "https://cloud.r-project.org/src/contrib/Archive/MASS/MASS_7.3-60.0.1.tar.gz")
install_cran("utf8", "https://cloud.r-project.org/src/contrib/utf8_1.2.4.tar.gz")
install_cran("Matrix", "https://cloud.r-project.org/src/contrib/Archive/Matrix/Matrix_1.6-5.tar.gz")
install_cran("hexbin", "https://cloud.r-project.org/src/contrib/hexbin_1.28.4.tar.gz")

cat("** Install Bioconductor packages\n")
install_bioc("reactome.db")
install_bioc("Biobase")
install_bioc("vsn")
install_bioc("MultiAssayExperiment")
install_bioc("fgsea")

cat("** All packages processed\n")