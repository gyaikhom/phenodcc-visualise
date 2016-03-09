% Users' Manual: _Phenoview - The Data Visualisation Web Application_
% Gagarine Yaikhom
% Last updated: 2 February 2015

<div class="version">This users' manual describes version 1 of 
_Phenoview_.</div>

# Introduction

_Phenoview_ is an interactive web application that allows a user to
visualise phenotype data collected by various research
institutes. One of its salient features is the ability to carry out
comparative visualisation of data for multiple genes from multiple
centres and multiple parameters simultaneously.

## Target users

Phenoview was designed primarily for _research scientists_ across
the world, and for the wider public who are interested in the
phenotype data collected by the International Mouse Phenotyping
Consortium (IMPC). This web application provides public access to the
visualisations as well as to the raw data so that further analysis can
be carried out independently by interested individuals.

## Accessing the web application

Phenoview is accessed using a standard web browser, such as Google
Chrome, by visiting the appropriate server. Once the application has
loaded, the web app is ready for usage.

When the web application loads, it is initialised into one of the
following modes, depending on the configuration supplied to it:

1. **Configuration mode** In this mode, a user is able to select
genes and parameters. The web app initialises to this mode if the user
has not selected any genes or parameters, or the supplied selection
could not be satisfied. (See [Initialising the web application](#initialising-the-web-application))

2. **Visualisation mode** In this mode, Phenoview displays
visualisations for the specified genes and parameters. It also displays the
relevant controls that allows a user to interact with the
visualisations. 


# Configuration mode

Configuration mode allows a user to select genes and
parameters. Phenoview displays the following when it is in this mode.

![Configuration mode][config_mode]

At the top of the screen, we have the main toolbar. This allows a user
to visit web pages related to the IMPC, and also to sign in, or sign
out, from `mousephenotype.org`.

On the left-hand side, we have the selection navigator. This allows a
user to look for genes and parameters to select. At the bottom of the
navigation bar, we have the <span class="control">visualise</span>
button, which switches Phenoview to _visualisation mode_.

Finally, in the centre-right, we have the contents area where relevant
data is displayed to the user. In the above example, Phenoview is
currently displaying all of the centres that are providing the
phenotype data.

## Phenotype Heatmap

The Phenotype Heatmap is a two-dimensional grid which displays the
results of statistical analysis on the available measurements. It
provides a quick summary of the gene-parameter combinations for which
there are measurements, and highlight the cell if there are any
statistically significant annotations. This is shown below:

![Phenotype heatmap][phenotype_heatmap1]

Each cell in the heatmap displays the statistical analysis result for
a gene-phenotype combination. It displays annotations for both
zygosity and sexual dimorphism. When a user hovers over a
gene-phenotype cell with detected phenodeviance, Phenoview displays a
pop-up dialog with details such as the ontology of the annotation,
such as "Increased heart rate", and the calculated _p_-values. This
provides a quick summrary of the interesting phenotypes. Clicking on
the cell displays a visualisation of the gene-phenotype combination,
which is a preview of the measurements.

To make browsing of the phenotypes easier, all of the related
parameters are group into phenotype categories. These categories are
displayed at the start of the web-application. By clicking on the
phenotype category or the _p_-value cells, users can drill down the
category to explore parameters that are classed under the same
category. This is shown below:

![Phenotype heatmap (expanding phenotype categories)][phenotype_heatmap2]

At the parameter-level, users can select and add parameters to the
basket for comparative visualisation by simply clicking on the row
headers. A basket button will appear on the row header cell. Clicking
again on the cell will remove the parameter from the basket.
To return to the higher-level categories, users should click on the
_phenotype navigator_ at the top of the heatmap.

Similarly, to make searching for genes easier, the heatmap displays a
gene index, where genes are grouped by the starting alphabet of their
gene symbol. Furthermore, a search box is provided next to the header
to search for specific genes by their gene symbol. To select and add a
specific gene to the basket for comparative visualisation, users can
click on the column headers. A basket icon should appear on the
cell. Clicking again on the cell should remove the gene from the
basket.

In the rest of the documentation, we describe other approaches to
selection gene-phenotype combinations for comparative visualisation.

## Selecting genes

To select genes from a list, the user has two options. These are:

1. **Centre oriented** In this approach, the user wishes to look for
   genes that are being phenotyped by a particular centre. To do this,
   a user must first click on the <span class="control">Centre</span>
   link on the navigation panel. This will list all of the available
   centres. Then, a user must click on the chosen centre, which will
   reveal all of the genes that are phenotyped by that centre. This is
   shown below:

   ![Centre genes][centre_genes]

   To select a gene, or to remove an already selected gene, simply
   click on the basket to the right of the corresponding gene row. The
   selection toggling of a gene will also change the colour of the
   basket. Furthermore, the number of genes under the _Comparison
   list_ section will change accordingly.

   ![Selecting and removing gene][centre_genes_select]

2. **Gene oriented** If the user is not sure about which centre is
   working on which gene, they can select a gene by searching for
   it. To do this, a user must first click on the <span
   class="control">Gene</span> link on the navigation panel. This will
   lists all of the genes that currently have phenotype data. Again,
   to select or remove a gene from the selection, the user should click
   on the corresponding basket. This is shown below:

   ![List all of the genes with phenotype data][all_genes]

   If the user specifically wishes to search for a particular gene,
   they can filter the list of genes by typing inside the search box,
   as shown below:

   ![Search for a specific gene][all_genes_search]

## Selecting parameters

To select parameters from a list, the user has two options. These are:

1. **Procedure oriented** In this approach, the user wishes to look for
   parameters whose measurements are recorded under a specific
   procedure. To do this, a user must first click on the <span
   class="control">Procedure</span> link on the navigation panel. This
   will list all of the procedures in [IMPReSS][impress] that can be
   visualised.

   ![All of the available procedures][all_procedures]

   Then, a user must click on the chosen procedure, which
   will reveal all of the parameters that are under the procedure. This
   is shown below:

   ![Procedure parameters][procedure_parameters]

   To select a parameter, or to remove an already selected parameter,
   simply click on the basket to the right of the corresponding
   parameter row. The selection toggling of a parameter will also
   change the colour of the basket. Furthermore, the number of
   parameter under the _Comparison list_ section will change
   accordingly.

2. **Parameter oriented** If the user is not sure about which
   procedure contains a specific parameter, they can still select a
   parameter by searching for it. To do this, a user must first click
   on the  <span class="control">Parameter</span> link on the
   navigation panel. This will lists all of the parameters in
   [IMPReSS][impress] that can be visualised. Again, to select or
   remove a parameter from the selection, the user should click 
   on the corresponding basket. This is shown below:

   ![List all of the parameters][all_parameters]

   If the user specifically wishes to search for a particular parameter,
   they can filter the list of parameters by typing inside the search box,
   as shown below:

   ![Search for a specific parameter][all_parameters_search]

# Visualisation mode

To enter the _visualisation mode_ from the _configuration mode_,
simply click on the <span class="button">Visualise</span> button. The
visualisation mode displays a two-dimensional grid of visualisations,
one visualisation for a gene and parameter pair, as shown below:

![Visualisation mode][view_mode]

On the left-hand side, we have the _visualisation controls_. The
visualisation controls allow a user to interact with the
visualisations. Using these controls, a user can alter the display of
the data points. At the top, Phenoview displays the list of genes that was
selected by the user. This contains a summary of the gene. For
instance, it contains the centre logo, centre short-name, [MGI][mgi]
identifier, strain and the gene symbol and allele.

The visualisation grid is organised such that all of the visualisations
in the same column belong to the same gene, and all of the
visualisations in the same row display a specific parameter. The
procedure and parameter information is displayed inside the
visualisation title.


## Visualisation controls

The visualisation controls is a set of icons that allows a user to
control the manner in which the data points are displayed. Each of
these controls are binary toggles, which can either be switched on or
switched off. These controls are, from the top:

![Visualisation controls][controls]

### Beeswarm and scatter plots

For scatter plots, it is possible to group the data points together
using the Beeswarm approach. This can be activated or deactivated by
clicking on the Beeswarm control. The following visualisations are
with and without Beeswarm activated:

![Visualisation with Beeswarm grouping][beeswarm_on]

![Visualisation without Beeswarm grouping][beeswarm_off]


## Sharing visualisations

Phenoview allows a user to share visualisations by sharing
_bookmarks_. Bookmarks are links that contain the necessary
parameters to initialise Phenoview to a required state. This is
described in detail in [Initialising the web
application](#initialising-the-web-application). To share a visualisation,
simply click on the share icon on the top-right corner of the visualisation
that you wish to share.

## Downloading raw data

To download the raw data that was used to produce a visualisation,
simply click on the download icon at the top-right corner of the
required visualisation. This will open a new browser tab with the raw
data in _Comma Separated Values_ (CSV) format. The header of this file
contains the fields that are exported as raw data. This ability
to export raw data allows individuals to carry out further analysis
independently of the analysis already carried out by the IMPC.

# Advanced usage

## Initialising the web application

Phenoview can be initialised to a required state. This helps users to
share bookmarks for further discussion and analysis. Phenoview accepts
the following [query
parameters]((http://en.wikipedia.org/wiki/Query_string) in the URL:

* List of gene selectors (`gid`)
    A valid `gid` parameter is a _comma separated_ list of gene
    selectors. Each gene selector could take one of the following
    _hyphen separated_ forms: 
     - `<genotype id>-<strain id>-<centre id>` Selects gene with
       the specified genotype, strain and centre.
     - `<genotype id>-<strain id>` Selects all genes with the
       specified genotype, strain from all centres.
     - `<genotype id>` Selects all genes that matches the specified
       genotype.

* List of parameter selectors (`qeid`)
    A valid `qeid` parameter is a _comma separated_ list of parameter
    keys, ontology terms identifiers or procedure types. Phenoview will first
    translate ontology terms and procedure types to associated parameters.
    These are then selected. The parameter keys in the translation must exists
    in [IMPReSS][impress] to be selectable. For instance, the following is
    an example:

        ?gid=377,181&qeid=MP:0004738,7,IMPC_GRS_001_001

* Control settings (`ctrl`)
    The control setting is a bitmap of the following binary values. If
    left unspecified, Phenoview sets this to `113121` by default.

    The binary options are:

     - **mean:** `0x1` - Show arithmetic mean
     - **median:** `0x2` - Show median
     - **max:** `0x4` - Show maximum values
     - **min:** `0x8` - Show minimum values
     - **quartile:** `0x10` - Show first and third quartiles
     - **female:** `0x20` - Include female specimens
     - **male:** `0x40` - Include male specimens
     - **point:** `0x80` - Show data points
     - **polyline:** `0x100` - Show polylines
     - **errorbar:** `0x200` - Show error bar (by default standard deviation)
     - **crosshair:** `0x400` - Show crosshair
     - **wildtype:** `0x800` - Include wild type specimens
     - **whisker:** `0x1000` - Show box and whisker
     - **whisker_iqr:** `0x2000` - Extend whiskers to 1.5 IQR
     - **infobar:** `0x4000` - Show information about the visualisation
     - **statistics:** `0x8000` - Show descriptive statistics
     - **swarm:** `0x10000` - Show beeswarm plot
     - **hom:** `0x20000` - Include homozygotes
     - **het:** `0x40000` - Include heterozygotes
     - **hem:** `0x80000` - Include hemizygotes
     - **std_err:** `0x100000` - Show standard error for error bars

* p-value threshold for annotations (`pt`)
    This affects how Phenoview displays a mouse phenotype call for a
    gene and parameter selection. If left unspecified, Phenoview sets
    this to `0.0001` by default.


The following is an example initialisation where Phenoview is asked to
display a comparative visualisation of two genes and two
parameters. We have also specified the control setting that we
require, and have set the p-value threshold to 0.00005:

    ?gid=20-19-11,377-35-4&qeid=IMPC_GRS_001_001,IMPC_GRS_002_001&ctrl=113121&pt=0.00005

# Downloading the measurements programmatically

The application programming interface for URL-based automated download of measurements are provided [here](download.html).

# Acknowledgements

The web application was developed using [Java][java], [MySQL
database][mysql], [D3JS (Data-Driven Documents)][d3js] and icons from
[IconsDB][iconsdb].


***

<div class="footer">Copyright (c) 2013 The International Mouse Phenotyping Consortium</div>

[all_genes]: images/all_genes.png
[all_genes_search]: images/all_genes_search.png
[all_parameters]: images/all_parameters.png
[all_parameters_search]: images/all_parameters_search.png
[all_procedures]: images/all_procedures.png
[annotation]: images/annotation.png
[beeswarm_off]: images/beeswarm_off.png
[beeswarm_on]: images/beeswarm_on.png
[centre_genes]: images/centre_genes.png
[centre_genes_select]: images/centre_genes_select.png
[config_mode]: images/config_mode.png
[error_bar]: images/error_bar.png
[gender]: images/gender.png
[gene_selection]: images/gene_selection.png
[gene_selection_search]: images/gene_selection_search.png
[parameter_selection]: images/parameter_selection.png
[parameter_selection_search]: images/parameter_selection_search.png
[procedure_parameters]: images/procedure_parameters.png
[scroll_visualisation]: images/scroll_visualisation.png
[select_specimen]: images/select_specimen.png
[stat]: images/stat.png
[view_mode]: images/view_mode.png
[whisker_iqr_off]: images/whisker_iqr_off.png
[whisker_off]: images/whisker_off.png
[whisker_on]: images/whisker_on.png
[whisker]: images/whisker.png
[wildtype_off]: images/wildtype_off.png
[zoom]: images/zoom.png
[zygosity]: images/zygosity.png
[controls]: images/controls.png
[phenotype_heatmap1]: images/phenotype_heatmap1.png
[phenotype_heatmap2]: images/phenotype_heatmap2.png


[impress]: https://www.mousephenotype.org/impress
[mgi]: http://www.informatics.jax.org/
[java]: http://www.oracle.com/technetwork/java/index.html "Java platform"
[mysql]: http://www.mysql.com/ "MySQL database"
[d3js]: http://d3js.org/ "Data-Driven Documents"
[iconsdb]: http://www.iconsdb.com/ "IconsDB"
