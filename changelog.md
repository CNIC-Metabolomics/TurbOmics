___
## 1.4

### Date 📅 *2026_02*

### Changes in the detail

+ Reduced the number of components in the version format. It now uses the [Major].[Minor] format (without 'v' character).
+ Added MIT License.
+ Added renewed sample data for both download and loading files.
+ Prevented the error KeyError: '['TP_Class'] not in index' in TPMetrics.py. TPMetrics was creating a duplicate TP_Class during merging.
+ Created a RESTful service that retrieves sample data (targeted and untargeted), including species information.
+ Added functionality to upload multiple custom pathways and use them in Pathway Integrative Analysis and Enrichment Analysis.
+ Updated python packages for Python 3.10.x.
+ Upgrade the front-end of TurbOmics.
+ TurboPutative 2.0 was written for Python 3.6–3.8 (NumPy <1.20, Pandas <1.3). On Python 3.12, you must sanitize dtypes.
+ Created two separate virtual environments because **PathwayIntegrate** depends on a dedicated set of package versions.
+ Pathway Integration Analysis (Multi-View and Single-View): view labels and integration were changed to the original methods.
+ Add a description for the new component that incorporates custom pathways into the PathwayIntegrate method and the MSEA analysis.
+ Reduceed the number of metabolities in the Untarget sample data.
+ Fixing a bug in searching for a job ID related to the Putative Annotation display.
+ Added the Untarget Sample of paper.
+ Added Sample Data Tutorial.


___
## v1.1.3

### Date 📅 *2026_01*

### Changes in the detail

+ Created a mirror clone [https://github.com/CNIC-Proteomics/TurboPutative-web](https://github.com/CNIC-Proteomics/TurboPutative-web) repository.

