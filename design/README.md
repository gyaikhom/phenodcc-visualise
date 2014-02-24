# Design of Phenoview

The _Phenoview_ code base is divided into two main parts:

* **Server-side**
  These are RESTful web services implemented in Java. Each of these
  services are custom designed to deliver raw data from the underlying
  MySQL databases. The presentation of the data is deferred to the
  client-side code.
  
* **Client-side**
  This is implemented in Javascript, with presentation
  layer styling specified in CSS. We use [D3](http://d3js.org) as the
  primary library to implement the visualisations.
  

## Execution modes

Phenoview operates under two modes:

* **Visualisation mode**
  This mode provides the primary function of Phenoview, which is to
  enable comparative visualisation of phenotype. In this mode, the
  user interface is designed to cater to enhance visualisation, and to
  allow effective controlling of the visualisations.
  
* **Configuration mode**
  This mode helps Phenoview achieve its primary objective by allowing
  effective mixing and matching of genotypes and phenotypes. In this
  mode, the user interface is designed to make selection of genes and
  phenotypic expressions easier.
  

The easiest way to understand the codebase is to run Phenoview in debug
mode, on the browser. Furthermore, the code base has been documented
thoroughly.


## RESTful web services

Unless otherwise specified, all identifiers are primary keys in corresponding tables in the PhenoDCC databases. The type and name of the properties in some of the JSON objects reflect type and column names in legacy database systems. Finally, where it is likely that a response will contain many records of the same type (e.g., measurements), we use one or two character property names to reduce JSON size.

### Animal overview (mouse specimen details)

* **class**: `AnimalOverviewFacadeREST`
* **request**: `GET`
* **path**: `rest/specimens`
* **path param**:
    * `id` - Specimen identifier.
* **description**: Returns specimen details.
* **example**: `https://www.mousephenotype.org/phenoview/rest/specimens/6410318`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of specimen records returned */
            "specimens": [ /* array of specimen records returned */
                {
                    "animalId": 6410318, /* specimen id (must match supplied) */
                    "animalName": "AP3S2-TM1B-IC/7.2f_5297114", /* specimen name */
                    "cohortName": "3894342", /* cohort name */
                    "cohortId": "3894342", /* cohort identifier */
                    "sex": "1", /* gender: 0 - female, 1 - male  */
                    "dob": 1367362800000, /* date-of-birth (timestamp in microseconds) */
                    "centreId": 4, /* centre identifier */
                    "shortName": "H", /* centre short name */
                    "strain": 35, /* strain identifier */
                    "strainName": null, /* strain name */
                    "homozygous": 1, /* zygosity: 0 - Heterozygous, 1 - Homozygous, 2 - Hemizygous */
                    "genotypeId": 335, /* genotype identifier */
                    "genotype": "H-Ap3s2-B08-TM1B", /* genotype name */
                    "pipeline": "HRWL_001", /* pipeline used */
                    "litter": "3894342", /* litter identifier */
                    "trackerId": 4451 /* internal PhenoDCC identifier */
                }
            ]
        }

### Annotations

* **class**: `AnnotationsFacadeREST`
* **request**: `GET`
* **path**: `rest/annotations`
* **query params**:
    * `genotypeId` - Genotype identifier in PhenoDCC database.
    * `parameterKey` - Parameter key in IMPReSS.
* **description**: Returns annotations for a given data context.
* **example**: `https://www.mousephenotype.org/phenoview/rest/annotations?genotypeId=335&parameterKey=IMPC_ACS_005_001`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of annotation records returned */
            "annotations": [ /* array of annotation records returned */
                {
                    "yMP": "MP:0001486", /* ontology term */
                    "yMP1": "MP:0005386", /* parent ontology term */
                    "mp1": { /* ontology details */
                         "mpTerm": "MP:0001486", /* MP term */
                         "description": "abnormal startle reflex",
                         "outcome": "ABNORMAL"
                    },
                    "i": 84286, /* annotation identifier in PhenoDCC database */
                    "p": 0.00350463773205456, /* p-value */
                    "e": "-152.321182795697", /* effect size */
                    "se": "40.878745165686", /* standard error */
                    "mm": "7", /* number of mutant males */
                    "mw": "467", /* number of wild-type males */
                    "fm": "8", /* number of mutant females */
                    "fw": "465", /* number of wild-type females */
                    "z": 1 /* zygosity */
                }
            ]
        }


### Available procedures with data

* **class**: `AvailableFacadeREST`
* **request**: `GET`
* **path**: `rest/available/centre/{centre_id}`
* **path param**:
    * `centre_id` - Centre identifier in PhenoDCC database.
* **description**: Returns list of procedures with data for specified centre.
* **example**: `https://www.mousephenotype.org/phenoview/rest/available/centre/4`
* **returns**: JSON array of procedure identifiers.

        {
            "success": true,
            "total": 18,
            "available": [
                81,83,84,87,89,90,91,94,103,106,108,109,148,150,151,153,155,82
            ]
        }

### Available parameters with data

* **class**: `AvailableFacadeREST`
* **request**: `GET`
* **path**: `rest/available/{procedure_id}`
* **path param**:
    * `procedure_id` - Procedure identifier in IMPReSS database.
* **query param**:
    * `cid` - Centre identifier in PhenoDCC database.
    * `gid` - Genotype identifier in PhenoDCC database.
    * `sid` - Strain identifier in PhenoDCC database.
* **description**: Returns list of parameters for specified procedure, genotype and strain.
* **example**: `https://www.mousephenotype.org/phenoview/rest/available/81?cid=6&gid=0&sid=35`
* **returns**: JSON array of parameter identifiers.

        {
            "success": true,
            "total": 34,
            "available": [
                1737,1738,1739,1740,1741,1742,1743,1744,1745,1746,1747,
                1748,1749,1750,1751,1752,1753,1754,1755,1756,1757,1758,
                1759,1760,1761,1762,1764,1765,1766,1767,1768,1769,1771,2151
            ]
        }

### Centres

* **class**: `CentreFacadeREST`
* **request**: `GET`
* **path**: `rest/centres`
* **description**: Returns all of the centres.
* **example**: `https://www.mousephenotype.org/phenoview/rest/centres`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of centre records returned */
            "centres": [ /* array of centre records returned */
                {
                    "i": 1, /* centre identifier */
                    "f": "Baylor College of Medicine", /* long name */
                    "s": "Bcm", /* short name (ILAR code) */
                    "a": "", /* address if available */
                    "m": "BCM" /* short name used by iMits */
                }
            ]
        }

### Gene details

* **class**: `GeneDetailsFacadeREST`
* **request**: `GET`
* **path**: `rest/genedetails`
* **path param**:
    * `id` - Specimen identifier.
* **description**: Returns gene details.
* **example**: `https://www.mousephenotype.org/phenoview/rest/genedetails/335`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of gene detail records returned */
            "details": [ /* array of gene detail records returned */
                {
                    "centreId": 4, /* centre identifier */
                    "genotypeId": 335, /* genotype identifier */
                    "strainId": 35, /* strain identifier */
                    "geneId": "MGI:1337060", /* MGI identifier */
                    "geneSymbol": "Ap3s2", /* gene symbol */
                    "genotype": "H-Ap3s2-B08-TM1B", /* genotype name */
                    "alleleName": "Ap3s2<sup>tm1b(EUCOMM)Hmgu</sup>" /* allele name */
                }
            ]
        }

### Genes and strains (all)

* **class**: `GeneStrainFacadeREST`
* **request**: `GET`
* **path**: `rest/genestrains`
* **description**: Returns all of the available genes and strains.
* **example**: `https://www.mousephenotype.org/phenoview/rest/genestrains`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of gene/strain records returned */
            "genestrains": [ /* array of gene/strain records returned */
                {
                    "cid": 12, /* centre identifier */
                    "gid": 968, /* genotype identifier */
                    "sid": 15, /* strain identifier */
                    "geneSymbol": "Acsl4", /* gene symbol */
                    "geneId": "MGI:1354713", /* MGI identifier */
                    "geneName": null, /* gene name */
                    "alleleName": "Acsl4<sup>tm1a(EUCOMM)Wtsi</sup>", /* allele name */
                    "strain": "B6Brd;B6Dnk;B6N-Tyr<c-Brd>", /* strain name */
                    "genotype": "MBGS", /* genotype */
                    "stateId": 2, /* QC status */
                    "numUnresolved": 0 /* number of unresolved QC issues */
                }
            ]
        }

### Genes and strains (which contains string)

* **class**: `GeneStrainFacadeREST`
* **request**: `GET`
* **path**: `rest/genestrains`
* **query param**:
    * `q` - String to filter with.
* **description**: Returns all of the genes and strains that contains the supplied string in gene symbol, strain or allele name.
* **example**: `https://www.mousephenotype.org/phenoview/rest/genestrains?q=Acs`
* **returns**: JSON with structure as described in previous section.

### Genes and strains selection

* **class**: `GeneStrainFacadeREST`
* **request**: `GET`
* **path**: `rest/genestrains`
* **query param**:
    * `g` - Comma separated list of genotype identifiers.
* **description**: Returns details of all of the genes and strains that are in the supplied list of genotype identifiers.
* **example**: `https://www.mousephenotype.org/phenoview/rest/genestrains?g=8,21,33`
* **returns**: JSON with structure as described in previous section.


### Measurements

* **class**: `MeasurementsFacadeREST`
* **request**: `GET`
* **path**: `rest/measurements`
* **query param**:
    * `centreId` - Centre identifier.
    * `genotypeId` - Genotype identifier.
    * `strainId` - Strain identifier.
    * `parameterKey` - Parameter key in IMPReSS.
    * `includeBaseline` - If `true`, include baseline/wild-type measurements.
* **description**: Returns all of the measurements for the supplied data context.
* **example**: `https://www.mousephenotype.org/phenoview/rest/measurements?includeBaseline=true&centreId=4&genotypeId=335&strainId=35&parameterKey=IMPC_ACS_005_001`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of measurement records returned */
            "measurements": [ /* array of measurement records returned */
                {
                    "m": 7864676, /* measurement identifier */
                    "a": 6410309, /* specimen identifier */
                    "g": 335, /* genotype identifier (0 for baseline/wild-type) */
                    "t": 35, /* strain identifier */
                    "s": 1, /* gender: 0 - female, 1 - male */
                    "z": 1, /* zygosity: 0 - Heterozygous, 1 - Homozygous, 2 - Hemizygous */
                    "d": 1373497200000, /* experiment start date (timestamp in microseconds) */
                    "v": "699.2", /* measured value */
                    "i": "0" /* OPTIONAL: if series plot, gives x-axis increment (see IMPReSS) */
                }
            ]
        }

### Parameter details

* **class**: `ParameterFacadeREST`
* **request**: `GET`
* **path**: `rest/parameter`
* **path param**:
    * `parameterKey` - Parameter key in IMPReSS.
* **description**: Return details for supplied parameter.
* **example**: JSON with following structures (depends on parameter type, see IMPReSS).

    * `https://www.mousephenotype.org/phenoview/rest/parameter/IMPC_CSD_005_001`

                {
                    "id": 2181, /* parameter identifier */
                    "e": "IMPC_CSD_005_001", /* IMPReSS parameter key */
                    "n": "Coat - color - back", /* parameter name */
                    "p": 82, /* procedure identifier */
                    "t": 3, /* graph type: 1 - scatter, 2 - series, 3 - categorical */
                    "d": "TEXT", /* measurement value */
                    "o": [ /* categories */
                        "As expected",
                        "Not as expected",
                        "No data"
                    ]
                }

    * `https://www.mousephenotype.org/phenoview/rest/parameter/IMPC_GRS_002_001`

                {
                    "id": 1833, /* parameter identifier */
                    "e": "IMPC_GRS_002_001", /* IMPReSS parameter key */
                    "n": "Forelimb and hindlimb grip strength measurement", /* parameter name */
                    "p": 83, /* procedure identifier */
                    "t": 2, /* graph type: 1 - scatter, 2 - series, 3 - categorical */
                    "d": "FLOAT", /* measurement value (used to convert string to float) */
                    "u": "g", /* measurement unit */
                    "ii": 117, /* increment identifier (IMPReSS) */
                    "iv": "1", /* increment value (IMPReSS) */
                    "it": "repeat", /* increment type (IMPReSS) */
                    "iu": "number", /* increment unit (IMPReSS) */
                    "im": 0, /* minimum increment (IMPReSS) */
                    "o": [] /* OPTIONAL: categories for nominal data */
                }

### Parameters

* **class**: `ParameterFacadeREST`
* **request**: `GET`
* **path**: `rest/parameter`
* **description**: Returns all of the available parameters.
* **example**: `https://www.mousephenotype.org/phenoview/rest/parameter`
* **returns**: JSON with following structure (depends on parameter type, see IMPReSS).

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of parameter records returned */
            "parameters": [ /* array of parameter records returned */
                {
                    "id": 2200, /* parameter identifier */
                    "e": "IMPC_CSD_024_001", /* IMPReSS parameter key */
                    "n": "Vibrissae - appearance", /* parameter name */
                    "p": 82, /* procedure identifier */
                    "t": 3, /* graph type: 1 - scatter, 2 - series, 3 - categorical */
                    "d": "TEXT", /* measurement data type */
                    "o": [ /* categories */
                        "As expected",
                        "Not as expected",
                        "No data"
                    ]
                }
            ]
        }

### Parameter selection

* **class**: `ParameterFacadeREST`
* **request**: `GET`
* **path**: `rest/parameter`
* **Query param**:
    * `q` - Comma separated list of parameter keys from IMPReSS.
* **description**: Returns details for all of the parameters that are in the supplied list of parameter keys.
* **example**: `https://www.mousephenotype.org/phenoview/rest/parameter?q=IMPC_CSD_024_001,IMPC_CSD_022_001`
* **returns**: JSON with structure as described in previous section.

### Procedures

* **class**: `ProcedureFacadeREST`
* **request**: `GET`
* **path**: `rest/procedure`
* **description**: Returns all of the available procedures.
* **example**: `https://www.mousephenotype.org/phenoview/rest/procedure`
* **returns**: JSON with following structure.

        {
            "success": true, /* true if successful; false, otherwise */
            "total": 1, /* number of procedure records returned */
            "procedures": [ /* array of procedure records returned */
                {
                    "i": 84, /* procedure identifier */
                    "k": "IMPC_ACS_001", /* IMPReSS procedure key */
                    "n": "Acoustic Startle and Pre-pulse Inhibition (PPI)",
                    "c": "ACS", /* procedure code */
                    "M": 1, /* major version number */
                    "m": 1 /* minor version number */
                }
            ]
        }

### Procedure details

* **class**: `ProcedureFacadeREST`
* **request**: `GET`
* **path**: `rest/procedure/details/{procedure_id}`
* **path param**:
    * `procedure_id` - Procedure Id in IMPReSS.
* **description**: Returns details of specified procedure.
* **example**: `https://www.mousephenotype.org/phenoview/rest/procedure/details/81`
* **returns**: JSON array of strings, where each string is a section taken from IMPReSS.

